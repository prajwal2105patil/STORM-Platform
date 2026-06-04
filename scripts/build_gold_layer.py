"""
build_gold_layer.py
===================
Build a local DuckDB gold layer from Supabase weather_monthly_stats.

This script:
1. Fetches weather data from Supabase REST API
2. Aggregates into DuckDB Parquet format
3. Creates indexed tables for fast local queries
4. Enables offline queries without cloud cost

Usage:
    python scripts/build_gold_layer.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import duckdb
import json
from urllib.request import urlopen, Request

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

def fetch_weather_data():
    """Fetch all weather_monthly_stats from Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/weather_monthly_stats?select=*"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
    }

    try:
        req = Request(url, headers=headers)
        with urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data
    except Exception as e:
        print(f"ERROR fetching data: {e}")
        return []

def main():
    print("=" * 70)
    print("DuckDB Gold Layer Builder")
    print("=" * 70)

    # Create data directory
    project_root = Path(__file__).parent.parent
    gold_dir = project_root / "data" / "gold"
    gold_dir.mkdir(parents=True, exist_ok=True)

    # Fetch data from Supabase
    print("\n[1/3] Fetching weather data from Supabase...")
    records = fetch_weather_data()
    print(f"      Downloaded {len(records)} records")

    if len(records) == 0:
        print("      ERROR: No data fetched. Check Supabase connection.")
        sys.exit(1)

    # Create DuckDB database
    print(f"\n[2/3] Building DuckDB gold layer...")
    db_path = gold_dir / "weather.duckdb"
    con = duckdb.connect(str(db_path))

    # Create weather table
    con.execute("""
        CREATE TABLE IF NOT EXISTS weather_monthly_stats (
            id VARCHAR,
            station_id VARCHAR,
            year INTEGER,
            month INTEGER,
            n_observations INTEGER,
            avg_wind_ms DOUBLE,
            peak_wind_ms DOUBLE,
            p95_wind_ms DOUBLE,
            exceedance_hours INTEGER,
            gale_confirmed BOOLEAN,
            period_start TIMESTAMP,
            period_end TIMESTAMP,
            created_at TIMESTAMP
        )
    """)

    # Clear existing data
    con.execute("DELETE FROM weather_monthly_stats")

    # Insert records
    for record in records:
        con.execute("""
            INSERT INTO weather_monthly_stats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            record.get("id"),
            record.get("station_id"),
            record.get("year"),
            record.get("month"),
            record.get("n_observations"),
            record.get("avg_wind_ms"),
            record.get("peak_wind_ms"),
            record.get("p95_wind_ms"),
            record.get("exceedance_hours"),
            record.get("gale_confirmed"),
            record.get("period_start"),
            record.get("period_end"),
            record.get("created_at"),
        ])

    # Create index
    con.execute("""
        CREATE INDEX IF NOT EXISTS idx_weather_station_year_month
        ON weather_monthly_stats(station_id, year, month)
    """)

    # Export as Parquet for sharing
    parquet_path = gold_dir / "weather_monthly_stats.parquet"
    con.execute(f"""
        COPY weather_monthly_stats TO '{parquet_path}' (FORMAT PARQUET)
    """)

    # Verify
    print(f"\n[3/3] Verification...")
    count = con.execute("SELECT COUNT(*) FROM weather_monthly_stats").fetchone()[0]
    stations = con.execute("""
        SELECT COUNT(DISTINCT station_id) FROM weather_monthly_stats
    """).fetchone()[0]

    print(f"      Total records: {count}")
    print(f"      Unique stations: {stations}")
    print(f"      Database: {db_path}")
    print(f"      Parquet export: {parquet_path}")

    # Sample query
    sample = con.execute("""
        SELECT station_id, year, month, peak_wind_ms
        FROM weather_monthly_stats
        ORDER BY year DESC, month DESC
        LIMIT 3
    """).fetchall()

    print(f"\n      Sample data:")
    for row in sample:
        print(f"        Station {row[0]}: {row[1]}/{row[2]} → Peak wind: {row[3]} m/s")

    con.close()

    print("\n" + "=" * 70)
    print("Gold layer ready. Queries can now run offline via DuckDB.")
    print("=" * 70)

if __name__ == "__main__":
    main()
