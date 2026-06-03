"""
DREADNOUGHT -- Synthetic NOAA ISD Sample Generator (v2 -- Indian Stations)
Produces schema-identical Parquet data for local DuckDB development.
Partition layout: data/sample/year={Y}/month={M}/part-0.parquet

Stations: NOAA ISD Indian subcontinent registry (Gujarat, Rajasthan, Maharashtra, Tamil Nadu)
Demo events injected:
  - Aug 2022: Hurricane-force winds at Naliya AF Base (42840) -- Kutch CERC claim
  - Aug 2022: Gale-force winds at Jaisalmer (42801) -- Rajasthan claim
  - Aug 2023: Hurricane-force winds at Naliya AF Base (42840) -- secondary demo
"""

import os
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from datetime import datetime, timedelta

np.random.seed(42)

# All 18 Indian NOAA ISD stations -- matches idw.STATION_REGISTRY exactly
STATIONS = [
    # id,      name,                          lat,      lon,    elev_m
    ("42840", "NALIYA AF BASE, IN",           23.2700,  68.8300, 124.0),
    ("42851", "BHUJ AIRPORT, IN",             23.2878,  69.6702,  84.0),
    ("42855", "KANDLA AIRPORT, IN",           23.1116,  70.1006,   9.0),
    ("42867", "AHMEDABAD AIRPORT, IN",        23.0771,  72.6347,  55.0),
    ("42869", "RAJKOT AIRPORT, IN",           22.3092,  70.7792, 134.0),
    ("42873", "SURAT AIRPORT, IN",            21.1141,  72.7416,  16.0),
    ("42872", "VADODARA AIRPORT, IN",         22.3362,  73.2268,  37.0),
    ("42862", "OKHA, IN",                     22.4667,  69.0667,   8.0),
    ("42863", "VERAVAL, IN",                  20.9000,  70.3667,   9.0),
    ("42801", "JAISALMER, IN",                26.9000,  70.9167, 229.0),
    ("42809", "JODHPUR AIRPORT, IN",          26.2511,  73.0489, 224.0),
    ("42823", "BARMER, IN",                   25.7500,  71.4000, 208.0),
    ("42824", "BIKANER AIRPORT, IN",          28.0706,  73.2072, 205.0),
    ("43003", "MUMBAI SANTACRUZ AIRPORT, IN", 19.0883,  72.8683,  14.0),
    ("43014", "PUNE AIRPORT, IN",             18.5793,  73.9089, 559.0),
    ("43279", "CHENNAI AIRPORT, IN",          12.9900,  80.1693,  16.0),
    ("43333", "RAMNAD, IN",                   9.3667,   78.8333,  22.0),
    ("43356", "TIRUNELVELI, IN",              8.7167,   77.7000,  44.0),
]

# Partitions to generate
PARTITIONS = [
    (2022, 7),   # pre-event baseline
    (2022, 8),   # PRIMARY DEMO -- Kutch CERC claim Aug 2022
    (2022, 9),   # post-event tail
    (2023, 8),   # secondary demo year
]

OUTPUT_BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "sample")

SCHEMA = pa.schema([
    pa.field("station",       pa.string()),
    pa.field("timestamp",     pa.timestamp("us", tz="UTC")),
    pa.field("year",          pa.int32()),
    pa.field("month",         pa.int32()),
    pa.field("station_name",  pa.string()),
    pa.field("latitude_d",    pa.float64()),
    pa.field("longitude_d",   pa.float64()),
    pa.field("elevation",     pa.string()),
    pa.field("air_temp_c",    pa.float64()),
    pa.field("dew_point_c",   pa.float64()),
    pa.field("wind_speed_ms", pa.float64()),
    pa.field("wind_dir_deg",  pa.int32()),
    pa.field("sea_level_hpa", pa.float64()),
    pa.field("visibility_m",  pa.int32()),
    pa.field("sky_ceiling_m", pa.int32()),
])


def days_in_month(year, month):
    if month == 12:
        return 31
    return (datetime(year, month + 1, 1) - datetime(year, month, 1)).days


def generate_partition(year, month):
    days = days_in_month(year, month)
    hours = days * 24
    # Inject hurricane event: hours 192-215 (day 9 00:00 to day 10 23:00)
    hurricane_hours = set(range(192, 216))
    records = []

    rng = np.random.default_rng(year * 100 + month)

    for sid, sname, lat, lon, elev in STATIONS:
        start = datetime(year, month, 1, 0, 0, 0)
        timestamps = [start + timedelta(hours=h) for h in range(hours)]

        # Indian monsoon climate: warm, humid, SW winds June-Sep
        is_monsoon = month in (6, 7, 8, 9)
        base_temp = 35.0 - (lat - 12) * 0.4 - (elev / 200.0)
        if is_monsoon:
            base_temp -= 4.0

        temp_diurnal = np.array([np.cos((h % 24 - 14) * np.pi / 12) * 3 for h in range(hours)])
        temp = base_temp + temp_diurnal + rng.normal(0, 0.8, hours)
        dew = temp - (rng.uniform(2, 6, hours) if is_monsoon else rng.uniform(10, 20, hours))

        # Wind: Weibull shape for Indian stations (monsoon stronger)
        wind_scale = 6.5 if is_monsoon else 3.5
        wind = np.abs(rng.weibull(1.8, hours) * wind_scale)
        wind_dir = rng.integers(180, 270, hours)  # SW monsoon
        slp = rng.normal(1008.0 if is_monsoon else 1015.0, 3.5, hours)
        vis = rng.choice([10000, 16000, 20000, 8000], hours)
        ceil = rng.choice([3000, 6000, 9000, 22000], hours)

        # ── INJECT HURRICANE EVENT: Naliya AF Base, Aug 2022 + Aug 2023 ─────
        if sid == "42840" and month == 8 and year in (2022, 2023):
            for h in hurricane_hours:
                if h < hours:
                    wind[h] = float(rng.uniform(34.2, 51.6))   # >32.9 = hurricane force
                    slp[h] = float(rng.uniform(942.0, 968.0))  # deep low pressure
                    vis[h] = 2000
                    ceil[h] = 500
                    temp[h] = float(rng.uniform(26.0, 29.0))

        # ── INJECT GALE EVENT: Bhuj, Aug 2022 (secondary corroboration) ─────
        if sid == "42851" and month == 8 and year == 2022:
            for h in hurricane_hours:
                if h < hours:
                    wind[h] = float(rng.uniform(24.5, 33.1))   # storm-force but sub-hurricane
                    slp[h] = float(rng.uniform(958.0, 975.0))

        # ── INJECT GALE EVENT: Jaisalmer, Aug 2022 ──────────────────────────
        if sid == "42801" and month == 8 and year == 2022:
            gale_hours = set(range(168, 192))  # day 8
            for h in gale_hours:
                if h < hours:
                    wind[h] = float(rng.uniform(17.8, 26.4))   # >17.2 = gale force
                    slp[h] = float(rng.uniform(990.0, 1002.0))

        # ── INJECT GALE EVENT: Jodhpur + Barmer corroboration ───────────────
        if sid in ("42809", "42823") and month == 8 and year == 2022:
            gale_hours = set(range(168, 192))
            for h in gale_hours:
                if h < hours:
                    wind[h] = float(rng.uniform(17.5, 22.0))

        for h in range(hours):
            records.append({
                "station":       sid,
                "timestamp":     pd.Timestamp(timestamps[h], tz="UTC"),
                "year":          np.int32(year),
                "month":         np.int32(month),
                "station_name":  sname,
                "latitude_d":    round(float(lat), 4),
                "longitude_d":   round(float(lon), 4),
                "elevation":     str(elev),
                "air_temp_c":    round(float(temp[h]), 1),
                "dew_point_c":   round(float(dew[h]), 1),
                "wind_speed_ms": round(float(wind[h]), 1),
                "wind_dir_deg":  int(wind_dir[h]),
                "sea_level_hpa": round(float(slp[h]), 1),
                "visibility_m":  int(vis[h]),
                "sky_ceiling_m": int(ceil[h]),
            })

    return pd.DataFrame(records)


def main():
    print("DREADNOUGHT -- Regenerating Indian ISD sample data")
    print("Stations: 18 NOAA ISD stations (Gujarat / Rajasthan / Maharashtra / Tamil Nadu)")
    print()
    total_rows = 0
    for year, month in PARTITIONS:
        partition_dir = os.path.join(OUTPUT_BASE, "year=%d" % year, "month=%d" % month)
        os.makedirs(partition_dir, exist_ok=True)
        out_path = os.path.join(partition_dir, "part-0.parquet")
        print("  Generating year=%d/month=%d ..." % (year, month), end=" ", flush=True)
        df = generate_partition(year, month)
        table = pa.Table.from_pandas(df, schema=SCHEMA, preserve_index=False)
        pq.write_table(table, out_path, compression="snappy")
        size_mb = os.path.getsize(out_path) / 1_048_576
        total_rows += len(df)
        print("%d rows  |  %.1f MB" % (len(df), size_mb))

    print()
    print("Done. Total rows: %d" % total_rows)
    print("Hurricane events: year=2022/month=8 and year=2023/month=8 @ Naliya AF Base (42840)")
    print("Gale events:      year=2022/month=8 @ Jaisalmer (42801), Jodhpur (42809), Barmer (42823)")
    print()
    print("Demo claims:")
    print("  VALIDATE: 'Hurricane-force winds at Kutch in August 2022 ...'")
    print("  VALIDATE: 'Gale force winds at Jaisalmer in August 2022 ...'")
    print("  REJECT:   Any claim referencing months without injected events")


if __name__ == "__main__":
    main()
