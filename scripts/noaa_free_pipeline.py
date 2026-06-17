"""
noaa_free_pipeline.py — PRODUCTION REBUILD
==========================================
ZERO COST path: NOAA public server -> Supabase. No GCP. No billing.

Pulls the FULL active-India station list dynamically from NOAA's master
catalog (isd-history.csv), downloads every station-year of hourly
observations for 2015-2026, computes monthly wind statistics, and rebuilds
the Supabase `stations` + `weather_monthly_stats` tables from scratch.

Station IDs are the REAL 6-digit NOAA USAF codes from the catalog — this
permanently fixes the three conflicting fake-ID schemes that existed in
idw.py, generate_sample.py, and the live Supabase table.

Usage:
    python scripts/noaa_free_pipeline.py            # full production rebuild
    python scripts/noaa_free_pipeline.py --sample   # 3-station smoke test
    python scripts/noaa_free_pipeline.py --dry-run  # catalog only, no Supabase writes

Cost : $0.00   |   Time : ~5-10 min full (concurrent downloads)
"""

import os
import sys
import csv
import io
import gzip
import argparse
import statistics
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from supabase import create_client
    from dotenv import load_dotenv
except ImportError:
    print("Missing packages. Run:  pip install supabase python-dotenv")
    sys.exit(1)

load_dotenv(Path(__file__).parent.parent / ".env")

# ── Config ───────────────────────────────────────────────────────────────────
SUPABASE_URL      = os.getenv("SUPABASE_URL")
SUPABASE_KEY      = os.getenv("SUPABASE_SERVICE_KEY")

NOAA_BASE         = "https://www.ncei.noaa.gov/pub/data/noaa/isd-lite"
CATALOG_URL       = "https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv"
# AWS open-data mirror of the catalog (byte-identical CSV). NOAA's /pub/data/
# HTTP gateway throws transient 503s; the catalog is mirrored on S3, so we fall
# back to it. NOTE: the isd-lite DATA files are NOT mirrored here, so a catalog
# hit via fallback does not guarantee the download step will succeed.
CATALOG_FALLBACK_URL = "https://noaa-isd-pds.s3.amazonaws.com/isd-history.csv"
CATALOG_RETRIES   = 4      # attempts per catalog source before giving up
RETRY_BACKOFF_S   = 3      # base backoff seconds; exponential 3, 6, 12, ...
MIN_REBUILD_FRACTION = 0.5 # refuse to wipe+reload if incoming < 50% of existing
YEARS             = range(2015, 2027)   # 2015–2026 (2026 = partial, most recent)
WIND_THRESHOLD_MS = 17.2                # Beaufort 8 (gale force)
MAX_WORKERS       = 16                  # concurrent downloads
ACTIVE_SINCE      = "20240101"          # station must report at least into 2024

# ── Wind QC (legal admissibility) ─────────────────────────────────────────────
# Raw ISD-Lite files for some Indian stations contain blocks of corrupt high
# readings (~40-50 m/s) that are physically impossible for an HOURLY MEAN
# surface wind. Left unfiltered, a single bad reading fabricates a "gale" and
# the adjudication validates on garbage — indefensible under Rule 803(8).
# We reject readings above a per-station robust envelope, clamped physically.
PHYS_CEILING_MS   = 30.0   # hourly-MEAN surface wind above this = sensor error
GALE_PRESERVE_MS  = 25.0   # never reject <= this, so genuine gales (>=17.2) survive
MAD_K             = 5.0    # extreme-outlier multiplier on robust (MAD) spread
MIN_QC_SAMPLE     = 30     # need this many readings to trust per-station stats

USER_AGENT        = {"User-Agent": "DREADNOUGHT-ASRE/2.1"}


# ── Step 1: station catalog (dynamic) ─────────────────────────────────────────
def _get_with_retry(url: str, attempts: int, timeout: int = 60) -> bytes:
    """GET a URL with exponential backoff. Retries on 5xx + network errors.
    4xx (except 429) fail fast — they won't fix themselves. Raises the last
    error if every attempt fails."""
    last: Exception | None = None
    for i in range(attempts):
        try:
            req = Request(url, headers=USER_AGENT)
            with urlopen(req, timeout=timeout) as r:
                return r.read()
        except HTTPError as e:
            last = e
            if e.code < 500 and e.code != 429:
                raise
        except URLError as e:
            last = e
        if i < attempts - 1:
            wait = RETRY_BACKOFF_S * (2 ** i)
            print(f"      ... fetch failed ({last}); retry {i+1}/{attempts-1} in {wait}s")
            time.sleep(wait)
    raise last  # type: ignore[misc]


def fetch_catalog(active_only: bool = True) -> list[dict]:
    """Download NOAA station catalog, return active Indian stations w/ coords.

    Tries the NOAA primary (with retries), then the S3 mirror. The catalog is
    mirrored on AWS but the isd-lite data files are not, so a fallback hit does
    not guarantee the subsequent download step will succeed if NOAA is down.
    """
    try:
        raw = _get_with_retry(CATALOG_URL, CATALOG_RETRIES)
    except (HTTPError, URLError) as e:
        print(f"      primary catalog unavailable ({e}); trying S3 mirror ...")
        raw = _get_with_retry(CATALOG_FALLBACK_URL, CATALOG_RETRIES)
    text = raw.decode("utf-8", errors="ignore")

    rows = []
    for row in csv.DictReader(io.StringIO(text)):
        if row.get("CTRY", "") != "IN":
            continue
        try:
            lat = float(row["LAT"]); lon = float(row["LON"])
        except (ValueError, KeyError):
            continue
        if lat == 0.0 and lon == 0.0:
            continue                       # null-island / missing coords
        if active_only and row.get("END", "") < ACTIVE_SINCE:
            continue

        usaf = row["USAF"].strip()
        wban = row["WBAN"].strip()
        if usaf == "999999":
            continue                       # no USAF id -> no isd-lite file

        rows.append({
            "id":    usaf,                 # 6-digit USAF — the canonical ID
            "wban":  wban,
            "name":  row["STATION NAME"].strip().title() or usaf,
            "lat":   round(lat, 4),
            "lon":   round(lon, 4),
            "state": (row.get("STATE", "") or "").strip(),
        })

    # De-dup on USAF (a station can have multiple WBAN history rows) — keep latest
    seen = {}
    for r in rows:
        seen[r["id"]] = r
    return list(seen.values())


# ── Step 2: ISD-Lite parse ─────────────────────────────────────────────────────
def _safe(val: str, scale: float):
    try:
        v = int(val)
        return v / scale if v != -9999 else None
    except ValueError:
        return None


def fetch_and_parse(usaf: str, wban: str, year: int) -> list:
    """Download one station-year; return list of wind speeds tagged by month."""
    url = f"{NOAA_BASE}/{year}/{usaf}-{wban}-{year}.gz"
    try:
        req = Request(url, headers=USER_AGENT)
        with urlopen(req, timeout=30) as resp:
            with gzip.GzipFile(fileobj=resp) as gz:
                raw = gz.read().decode("ascii", errors="ignore")
    except (HTTPError, URLError):
        return []

    out = []
    for line in raw.strip().splitlines():
        p = line.split()
        if len(p) < 9:
            continue
        try:
            mo = int(p[1])
        except ValueError:
            continue
        wind = _safe(p[8], 10.0)
        if wind is None:
            continue
        out.append((mo, wind))
    return out


# ── Step 3: per-station QC + monthly aggregation ───────────────────────────────
def station_wind_ceiling(winds: list) -> float:
    """Per-station robust upper bound for a valid hourly-mean wind reading.

    Statistical (per-station MAD envelope) anchored by physical limits:

        ceiling = clamp( median + MAD_K * 1.4826*MAD,  GALE_PRESERVE_MS .. PHYS_CEILING_MS )

    - Lower clamp (25 m/s) guarantees every genuine gale (>= 17.2) survives.
    - Upper clamp (30 m/s) removes corruption even when a whole station is
      mostly bad (which would otherwise inflate its own median).
    - MAD is robust: a minority of corrupt readings does not move it.
    """
    if len(winds) < MIN_QC_SAMPLE:
        return PHYS_CEILING_MS
    med = statistics.median(winds)
    mad = statistics.median([abs(w - med) for w in winds]) * 1.4826  # ~sigma
    stat = med + MAD_K * mad
    return min(PHYS_CEILING_MS, max(GALE_PRESERVE_MS, stat))


def aggregate_station(station_id: str, records: list) -> tuple:
    """records = list of (year, month, wind) across ALL years for one station.

    Computes the station's QC ceiling from its full record, then aggregates
    monthly stats on the QC-passed readings. Returns (rows, n_rejected).
    """
    ceiling = station_wind_ceiling([w for (_, _, w) in records])

    by_ym = defaultdict(list)
    n_rejected = 0
    for year, month, wind in records:
        if wind > ceiling:
            n_rejected += 1
            continue
        by_ym[(year, month)].append(wind)

    rows = []
    for (year, month), winds in sorted(by_ym.items()):
        if not winds:
            continue
        n      = len(winds)
        winds_s = sorted(winds)
        peak   = winds_s[-1]
        low    = winds_s[0]
        avg    = sum(winds) / n
        med    = statistics.median(winds_s)
        std    = statistics.pstdev(winds)   # population: full month of readings
        p95    = winds_s[min(int(0.95 * n), n - 1)]
        exc    = sum(1 for w in winds if w >= WIND_THRESHOLD_MS)
        rows.append({
            "station_id":       station_id,
            "year":             year,
            "month":            month,
            "n_observations":   n,
            "avg_wind_ms":      round(avg, 3),
            "min_wind_ms":      round(low, 3),
            "median_wind_ms":   round(med, 3),
            "std_wind_ms":      round(std, 3),
            "peak_wind_ms":     round(peak, 3),
            "p95_wind_ms":      round(p95, 3),
            "exceedance_hours": exc,
            "gale_confirmed":   exc >= 3 and peak >= WIND_THRESHOLD_MS,
        })
    return rows, n_rejected


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample",  action="store_true", help="3-station smoke test")
    ap.add_argument("--dry-run", action="store_true", help="catalog only, no Supabase writes")
    ap.add_argument("--force",   action="store_true", help="override the partial-rebuild safety guard")
    args = ap.parse_args()

    print("=" * 68)
    print("DREADNOUGHT — NOAA Production Pipeline  (source: ncei.noaa.gov, $0.00)")
    print("=" * 68)

    print("\n[1/5] Fetching NOAA station catalog ...")
    try:
        stations = fetch_catalog(active_only=True)
    except (HTTPError, URLError) as e:
        print("\n" + "=" * 68)
        print("  NOAA UNAVAILABLE - catalog failed after retries + S3 fallback.")
        print(f"  Last error: {e}")
        print("  This is a transient NOAA outage (their /pub/data/ gateway), not")
        print("  a data problem. Your existing Supabase data is UNTOUCHED.")
        print("  Re-run when https://www.ncei.noaa.gov/pub/data/noaa/ returns 200.")
        print("=" * 68)
        sys.exit(2)
    print(f"      {len(stations)} active Indian stations with valid coordinates")

    if args.sample:
        stations = stations[:3]
        print(f"      SAMPLE MODE — limiting to {len(stations)} stations")

    years = list(YEARS)
    total_files = len(stations) * len(years)
    print(f"      {len(stations)} stations x {len(years)} years = {total_files} files to fetch")

    if args.dry_run:
        print("\n      DRY RUN — first 10 stations:")
        for s in stations[:10]:
            print(f"        {s['id']}  {s['name']:<32} ({s['lat']:.2f},{s['lon']:.2f})")
        print("\n      Exiting (no downloads, no Supabase writes).")
        return

    # ── Download concurrently, collect raw readings per station ─────────────────
    print(f"\n[2/5] Downloading {total_files} files (concurrent, {MAX_WORKERS} workers) ...")
    station_recs = defaultdict(list)   # sid -> [(year, month, wind), ...] across all years
    found       = 0
    done        = 0
    raw_obs     = 0

    def task(s, year):
        recs = fetch_and_parse(s["id"], s["wban"], year)
        return s["id"], year, recs

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = [ex.submit(task, s, y) for s in stations for y in years]
        for fut in as_completed(futures):
            sid, year, recs = fut.result()
            done += 1
            if recs:
                found += 1
                for mo, wind in recs:
                    station_recs[sid].append((year, mo, wind))
                raw_obs += len(recs)
            if done % 250 == 0 or done == total_files:
                pct = done / total_files * 100
                print(f"      {done:5d}/{total_files} ({pct:4.0f}%)  files_with_data={found}  raw_obs={raw_obs}")

    # ── Per-station QC + monthly aggregation ────────────────────────────────────
    print(f"\n      Files with data : {found}/{total_files}")
    print(f"      Raw observations: {raw_obs}")
    all_stats     = []
    total_reject  = 0
    for sid, recs in station_recs.items():
        rows, nrej = aggregate_station(sid, recs)
        all_stats.extend(rows)
        total_reject += nrej
    rej_pct = (total_reject / raw_obs * 100) if raw_obs else 0
    print(f"      QC rejected     : {total_reject} implausible readings ({rej_pct:.2f}%) "
          f"[per-station MAD envelope, capped {GALE_PRESERVE_MS}-{PHYS_CEILING_MS} m/s]")
    print(f"      Monthly rows    : {len(all_stats)}")
    if not all_stats:
        print("\nERROR: no data downloaded — check internet connection.")
        sys.exit(1)

    # ── Connect Supabase ────────────────────────────────────────────────────────
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env")
        sys.exit(1)
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Keep only stations that actually produced data (FK integrity)
    stations_with_data = {r["station_id"] for r in all_stats}
    station_rows = [
        {"id": s["id"], "name": s["name"], "lat": s["lat"], "lon": s["lon"], "state": s["state"]}
        for s in stations if s["id"] in stations_with_data
    ]

    # ── Refresh data ───────────────────────────────────────────────────────────
    # SAFETY: --sample is an additive smoke test — it must NOT wipe production
    # data. Only a full rebuild clears the weather table.
    #
    # We wipe weather_monthly_stats (no inbound FK) and re-upsert it fresh, but
    # we do NOT delete `stations`: the `claims` table FK-references stations via
    # nearest_station_id, so a blanket delete fails (23503) and would orphan real
    # adjudication records. Stations carry stable real USAF IDs, so the upsert in
    # [4/5] idempotently refreshes them; any station cited by a claim is kept.
    if args.sample:
        print(f"\n[3/5] SAMPLE MODE — skipping weather wipe (additive upsert only)")
    else:
        # SAFETY GUARD: a PARTIAL NOAA outage can return a handful of stations
        # while the rest 404. Wiping + reloading with that fraction would gut the
        # legal-admissibility record. Refuse unless the incoming rebuild is at
        # least MIN_REBUILD_FRACTION of what is already live (override: --force).
        existing = sb.table("weather_monthly_stats").select("id", count="exact").limit(1).execute().count or 0
        incoming = len(all_stats)
        if existing and incoming < existing * MIN_REBUILD_FRACTION and not args.force:
            print("\n" + "=" * 68)
            print(f"  ABORT: incoming rebuild has {incoming} rows but {existing} are live")
            print(f"  ({incoming / existing * 100:.0f}% < {MIN_REBUILD_FRACTION * 100:.0f}% floor). NOAA may be")
            print("  partially down. NOT wiping - your data is safe. Re-run when NOAA")
            print("  is healthy, or pass --force if this shrinkage is intentional.")
            print("=" * 68)
            sys.exit(3)
        print(f"\n[3/5] Clearing weather_monthly_stats (stations refreshed via upsert) ...")
        sb.table("weather_monthly_stats").delete().neq("year", -1).execute()
        print("      weather_monthly_stats cleared")

    # ── Load stations ───────────────────────────────────────────────────────────
    print(f"\n[4/5] Loading {len(station_rows)} real stations ...")
    for i in range(0, len(station_rows), 200):
        sb.table("stations").upsert(station_rows[i:i+200], on_conflict="id").execute()
    print(f"      {len(station_rows)} stations loaded")

    # ── Load weather ────────────────────────────────────────────────────────────
    print(f"\n[5/5] Loading {len(all_stats)} monthly weather rows ...")
    BATCH = 500
    for i in range(0, len(all_stats), BATCH):
        sb.table("weather_monthly_stats").upsert(
            all_stats[i:i+BATCH], on_conflict="station_id,year,month"
        ).execute()
        if (i // BATCH) % 10 == 0:
            print(f"      {min(i+BATCH, len(all_stats))}/{len(all_stats)} rows")

    # ── Verify ──────────────────────────────────────────────────────────────────
    n_st  = sb.table("stations").select("*", count="exact").limit(1).execute().count
    n_w   = sb.table("weather_monthly_stats").select("*", count="exact").limit(1).execute().count
    n_g   = sb.table("weather_monthly_stats").select("*", count="exact").eq("gale_confirmed", True).limit(1).execute().count

    print("\n" + "=" * 68)
    print(f"  DONE.  stations={n_st}  weather_rows={n_w}  gale_months={n_g}")
    print(f"  Webapp is now production-ready across {n_st} Indian stations — $0 spent.")
    print("=" * 68)


if __name__ == "__main__":
    main()
