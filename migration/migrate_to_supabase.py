"""
migrate_to_supabase.py
======================
One-time migration: DuckDB local Parquet → Supabase PostgreSQL

This script reads the existing NOAA ISD Parquet sample via DuckDB,
computes monthly wind statistics per station, and uploads them to
Supabase. Run this ONCE from your local machine with credentials.

After this migration, the web app queries Supabase — zero GCP spend.

Usage:
    pip install duckdb supabase python-dotenv --break-system-packages
    export SUPABASE_URL=https://xxxx.supabase.co
    export SUPABASE_SERVICE_KEY=eyJ...
    python migration/migrate_to_supabase.py

Supabase tables created by this script (run SQL in Supabase dashboard first):
    See: migration/supabase_schema.sql
"""

import os, sys, json, duckdb, datetime
from pathlib import Path

try:
    from supabase import create_client, Client
    from dotenv import load_dotenv
except ImportError:
    print("Run: pip install supabase python-dotenv duckdb --break-system-packages")
    sys.exit(1)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # use service key for migration

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PARQUET_GLOB = str(PROJECT_ROOT / "data" / "sample" / "**" / "*.parquet")

# ── NOAA ISD Station Registry (18 Indian stations) ────────────────────────
STATION_REGISTRY = [
    {"id": "42182", "name": "Jaisalmer",     "lat": 26.9090, "lon": 70.9000, "state": "Rajasthan"},
    {"id": "42339", "name": "Bikaner",        "lat": 28.0700, "lon": 73.3000, "state": "Rajasthan"},
    {"id": "42367", "name": "Jodhpur",        "lat": 26.3000, "lon": 73.0200, "state": "Rajasthan"},
    {"id": "42492", "name": "Jaipur",         "lat": 26.8200, "lon": 75.8000, "state": "Rajasthan"},
    {"id": "42647", "name": "Ahmedabad",      "lat": 23.0700, "lon": 72.6300, "state": "Gujarat"},
    {"id": "42680", "name": "Rajkot",         "lat": 22.3000, "lon": 70.7700, "state": "Gujarat"},
    {"id": "42701", "name": "Bhuj",           "lat": 23.2500, "lon": 69.6700, "state": "Gujarat"},
    {"id": "42867", "name": "Surat",          "lat": 21.2000, "lon": 72.8400, "state": "Gujarat"},
    {"id": "43003", "name": "Mumbai",         "lat": 19.0900, "lon": 72.8500, "state": "Maharashtra"},
    {"id": "43057", "name": "Pune",           "lat": 18.5300, "lon": 73.8600, "state": "Maharashtra"},
    {"id": "43150", "name": "Nagpur",         "lat": 21.1000, "lon": 79.0500, "state": "Maharashtra"},
    {"id": "43285", "name": "Hyderabad",      "lat": 17.4500, "lon": 78.4700, "state": "Telangana"},
    {"id": "43346", "name": "Chennai",        "lat": 13.0000, "lon": 80.1800, "state": "Tamil Nadu"},
    {"id": "43430", "name": "Bangalore",      "lat": 12.9700, "lon": 77.5800, "state": "Karnataka"},
    {"id": "43466", "name": "Kochi",          "lat": 9.9700,  "lon": 76.2800, "state": "Kerala"},
    {"id": "42650", "name": "Vadodara",       "lat": 22.3600, "lon": 73.2300, "state": "Gujarat"},
    {"id": "42971", "name": "Bhopal",         "lat": 23.2800, "lon": 77.3500, "state": "Madhya Pradesh"},
    {"id": "43128", "name": "Kolhapur",       "lat": 16.7100, "lon": 74.2400, "state": "Maharashtra"},
]

WIND_THRESHOLD_MS = 17.2  # Beaufort 8 gale force

def migrate():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    con = duckdb.connect()

    print("=" * 60)
    print("DREADNOUGHT -> Supabase Migration")
    print("=" * 60)

    # Step 1: Upsert stations
    print("\n[1/4] Upserting station registry...")
    result = supabase.table("stations").upsert(STATION_REGISTRY, on_conflict="id").execute()
    print(f"      {len(STATION_REGISTRY)} stations upserted")

    # Step 2: Discover available data combos
    print("\n[2/4] Discovering available year/month combos in Parquet...")
    try:
        combos = con.execute(f"""
            SELECT DISTINCT station, year, month
            FROM read_parquet('{PARQUET_GLOB}', hive_partitioning=true)
            WHERE station IS NOT NULL
            ORDER BY station, year, month
        """).fetchall()
        print(f"      Found {len(combos)} station/year/month combos")
    except Exception as e:
        print(f"      ERROR reading Parquet: {e}")
        print(f"      Ensure Parquet files exist at: {PARQUET_GLOB}")
        sys.exit(1)

    # ── Step 3: Compute monthly stats and upload ───────────────────────
    print(f"\n[3/4] Computing monthly wind statistics...")
    records = []
    valid_station_ids = {s["id"] for s in STATION_REGISTRY}
    for i, (station, year, month) in enumerate(combos):
        if station not in valid_station_ids:
            continue  # Skip unknown stations
        try:
            row = con.execute(f"""
                SELECT
                    COUNT(*)                                            AS n_obs,
                    AVG(wind_speed_ms)                                  AS avg_wind_ms,
                    MAX(wind_speed_ms)                                  AS peak_wind_ms,
                    PERCENTILE_CONT(0.95) WITHIN GROUP
                        (ORDER BY wind_speed_ms)                        AS p95_wind_ms,
                    SUM(CASE WHEN wind_speed_ms >= {WIND_THRESHOLD_MS}
                             THEN 1 ELSE 0 END)                         AS exceedance_hours,
                    MIN(timestamp)                                      AS period_start,
                    MAX(timestamp)                                      AS period_end
                FROM read_parquet('{PARQUET_GLOB}', hive_partitioning=true)
                WHERE station='{station}'
                  AND year={year}
                  AND month={month}
            """).fetchone()

            if row and row[0] > 0:
                records.append({
                    "station_id":        station,
                    "year":              int(year),
                    "month":             int(month),
                    "n_observations":    int(row[0]),
                    "avg_wind_ms":       round(float(row[1] or 0), 3),
                    "peak_wind_ms":      round(float(row[2] or 0), 3),
                    "p95_wind_ms":       round(float(row[3] or 0), 3),
                    "exceedance_hours":  int(row[4] or 0),
                    "period_start":      str(row[5]) if row[5] else None,
                    "period_end":        str(row[6]) if row[6] else None,
                    "gale_confirmed":    int(row[4] or 0) >= 3 and float(row[2] or 0) >= WIND_THRESHOLD_MS,
                })

        except Exception as e:
            print(f"      SKIP {station}/{year}/{month}: {e}")
            continue

        if (i+1) % 10 == 0:
            print(f"      [{i+1}/{len(combos)}] processed...")

    print(f"\n      Computed {len(records)} monthly station summaries")

    # ── Upload in batches ──────────────────────────────────────────────
    BATCH = 50
    for i in range(0, len(records), BATCH):
        batch = records[i:i+BATCH]
        supabase.table("weather_monthly_stats").upsert(
            batch, on_conflict="station_id,year,month"
        ).execute()
        print(f"      Uploaded batch {i//BATCH + 1}/{(len(records)//BATCH)+1}")

    # ── Step 4: Verify ────────────────────────────────────────────────
    print("\n[4/4] Verification...")
    count = supabase.table("weather_monthly_stats").select("*", count="exact").execute()
    print(f"      weather_monthly_stats: {count.count} rows in Supabase")
    stations = supabase.table("stations").select("*", count="exact").execute()
    print(f"      stations: {stations.count} rows in Supabase")

    print("\n" + "=" * 60)
    print("Migration complete. Web app is now GCP-independent.")
    print("=" * 60)

if __name__ == "__main__":
    migrate()
