# DREADNOUGHT / ASRE — Data & Adjudication Methodology

**Status:** authoritative. This document is the single source of truth for *what
the system measures, how, and from what data.* If code and this document
disagree, treat it as a bug in one of them and reconcile.

**Last reviewed:** 2026-06-17 · **Coverage:** 408 Indian stations · 2015–2026 · wind only

---

## 1. What the product actually does

ASRE adjudicates **force-majeure / SLA weather claims** deterministically. Given
an asset location and a claim window, it answers one legally-scoped question:

> Was there a *sustained gale-force wind event* at the nearest NOAA station
> during the claimed period?

It is **decision-support**, not legal advice. Every output carries a provenance
string and a disclaimer; filing and legal interpretation remain with counsel.

---

## 2. Data lineage (read this before trusting any number)

There are **two engines over two datasets**. They are intentionally different and
must not be conflated.

| | **Production (deployed)** | **Research / benchmark (local)** |
|---|---|---|
| Engine | `webapp/lib/asre.ts` (TypeScript) | `asre/engine.py` (Python, LangGraph) |
| Store | Supabase Postgres | Local DuckDB / Parquet (`data/sample/**`) |
| Granularity | Pre-aggregated **monthly** wind stats | Raw **hourly** observations |
| Variables | **Wind only** | Wind + temperature + pressure + visibility |
| Perils | Gale-force wind | Wind, temp, pressure (experimental) |
| Window | 2015–2026 | 6 sample partitions (2022–2023 summer) |

**Honesty rule:** only the **wind** peril is a live capability. The Python
engine's temperature/pressure perils exist for ablation studies only — see the
`PRODUCTION_PERILS` set and parity banner in `asre/engine.py`. Do **not** cite
them in a pitch as deployed features.

### Raw source
- **NOAA Integrated Surface Database (ISD-Lite)**, `ncei.noaa.gov` — U.S. federal
  public record. Pulled at **$0** by `scripts/noaa_free_pipeline.py`.
- Station universe comes from NOAA's `isd-history.csv` catalog, filtered to
  `CTRY=IN`, valid coordinates (no Null Island), active into 2024+, with a real
  6-digit USAF id. De-duplicated on USAF.

---

## 3. Ingestion pipeline (`scripts/noaa_free_pipeline.py`)

```
catalog → download (16-way concurrent) → per-station QC → monthly aggregate → Supabase upsert
```

1. **Catalog** — download `isd-history.csv`, select active Indian stations (~408).
2. **Download** — 408 stations × 2015–2026 station-years of hourly ISD-Lite `.gz`.
   Missing station-years return empty and are skipped (2026 is partial by design).
3. **Quality control** — see §4.
4. **Aggregate** — per `(station, year, month)`: `n_observations`, `avg_wind_ms`,
   `peak_wind_ms`, `p95_wind_ms`, `exceedance_hours`, `gale_confirmed`.
5. **Load** — `weather_monthly_stats` is wiped and re-loaded; `stations` is
   **upserted, never deleted** (the `claims.nearest_station_id` FK would orphan
   real adjudication records). `--sample` is additive and never wipes production.

> **Operational note:** the deployed UI advertises 2015–2026. That becomes true
> only after re-running the pipeline:
> `python scripts/noaa_free_pipeline.py` (needs `SUPABASE_URL` +
> `SUPABASE_SERVICE_KEY`, ~5–10 min, $0). Until then the live table is whatever
> the last rebuild loaded.

---

## 4. Quality control — the legal-admissibility core

Raw ISD-Lite contains blocks of physically-impossible hourly-mean winds
(~40–50 m/s) from sensor faults. Unfiltered, **one** bad reading fabricates a
"gale" and the engine validates on garbage — indefensible under Rule 803(8).

Each station gets a **robust upper bound** computed from its *own full record*:

```
ceiling = clamp( median + 5 · (1.4826 · MAD),  25 m/s .. 30 m/s )
```

- **MAD** (median absolute deviation) is robust: a minority of corrupt readings
  does not move it, so the envelope reflects the station's true behaviour.
- **Lower clamp 25 m/s** guarantees every genuine gale (≥ 17.2) survives QC.
- **Upper clamp 30 m/s** removes corruption even when a station is mostly bad
  (which would otherwise inflate its own median).
- Stations with < 30 readings fall back to the physical ceiling (30 m/s).

Readings above the ceiling are dropped before aggregation. The rebuild reports
the rejection rate; historically this cut implausible gale-months from 104 → 30.

---

## 5. Adjudication logic (both engines agree on the wind path)

Deterministic, with the LLM confined to a single classification step.

| Node | Action | Deterministic? |
|---|---|---|
| 1. Intent Router | validate dates + coordinates; classify cause | LLM (Groq) *only* for ambiguous causes; keyword + negation are deterministic & cached |
| 2. SQL Generator | nearest stations within **300 km** via Haversine; **IDW** (power 2) spatial weighting | yes |
| 3. Execution Cage | look up monthly wind stats for every `(year, month)` in the window | yes |
| 4. Adjudicator | apply the gate below | yes |

**Validation gate (identical in production and benchmark engines):**

```
VALIDATED  ⟺  peak_wind ≥ 17.2 m/s  AND  exceedance_hours ≥ 3
```

- **17.2 m/s** = Beaufort Force 8 (gale).
- **≥ 3 hours** = *sustained* event. A single exceeding hour is not a force-majeure
  event. The Python engine enforces this via `MIN_EXCEEDANCE_HOURS = 3` in its SQL
  `HAVING` clause (aligned 2026-06-17 — re-run benchmarks after this change).

Rejection labels: `REJECTED_NON_WEATHER`, `REJECTED_BELOW_THRESHOLD`,
`REJECTED_WRONG_MONTH`, `REJECTED_MALFORMED_COORDS`, `INSUFFICIENT_DATA`
(no station within 300 km, or no data for the window).

---

## 6. Legal basis

- **U.S. FRE 803(8)** — NOAA ISD admitted as a public record.
- **Indian Evidence Act s74 / s78(6)** — public & foreign official records.
- **IT Act 2000 s65B** — electronic records.
- Cross-reference with IMD station data is recommended for CERC filings.

---

## 7. Known limits (state these honestly; don't get caught by them)

- **Geography:** India only. New regions = re-run the pipeline with a different
  `CTRY` filter.
- **Peril:** wind only in production. Temp/pressure are not deployed.
- **Resolution:** monthly aggregates in production (hourly only in the local
  sample). Exceedance is counted at hourly resolution *before* aggregation.
- **2026 is partial** — current-year data lags real time by NOAA's publish cadence.
- **Spatial:** claims with no NOAA station within 300 km return `INSUFFICIENT_DATA`
  by design rather than guessing.

---

## 8. Cost posture

Dev and ingestion are **$0** (local DuckDB + NOAA public files). Any BigQuery
path must inject `maximum_bytes_billed` and filter on `year`/`month` partitions —
see `.claude/rules/sql-partitions.md`.
