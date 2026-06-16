"""
supabase_backup.py — $0 logical backup of Supabase tables
=========================================================
Free-tier Supabase has NO automated backups / point-in-time recovery (that's a
Pro feature). This script is the zero-cost stand-in: it dumps every table to a
timestamped JSON snapshot you can re-import.

PRIORITY: customers / claims / audit_log are NOT rebuildable — they are the
real business + legal-chain-of-custody data. stations / weather_monthly_stats
ARE rebuildable for free from NOAA via noaa_free_pipeline.py, so they are
backed up too but are lower-risk.

Usage:
    python scripts/supabase_backup.py              # back up critical tables
    python scripts/supabase_backup.py --all        # include rebuildable weather
    python scripts/supabase_backup.py --out DIR    # custom output dir

Output : backups/backup_YYYYMMDD_HHMMSS/<table>.json
Cost   : $0.00
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone
from pathlib import Path

try:
    from supabase import create_client
    from dotenv import load_dotenv
except ImportError:
    print("Missing packages. Run:  pip install supabase python-dotenv")
    sys.exit(1)

load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

CRITICAL_TABLES    = ["customers", "claims", "audit_log"]
REBUILDABLE_TABLES = ["stations", "weather_monthly_stats"]

PAGE = 1000  # Supabase caps a single select at 1000 rows


def dump_table(sb, table: str, out_dir: Path) -> int:
    """Page through an entire table and write it to <table>.json. Returns rows."""
    rows: list = []
    start = 0
    while True:
        resp = sb.table(table).select("*").range(start, start + PAGE - 1).execute()
        batch = resp.data or []
        rows.extend(batch)
        if len(batch) < PAGE:
            break
        start += PAGE

    (out_dir / f"{table}.json").write_text(
        json.dumps(rows, indent=2, default=str), encoding="utf-8"
    )
    return len(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true",
                    help="also back up rebuildable weather/stations tables")
    ap.add_argument("--out", default=None, help="output directory root")
    args = ap.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env")
        sys.exit(1)

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    tables = list(CRITICAL_TABLES)
    if args.all:
        tables += REBUILDABLE_TABLES

    root = Path(args.out) if args.out else Path(__file__).parent.parent / "backups"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_dir = root / f"backup_{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Backing up {len(tables)} tables -> {out_dir}")
    manifest = {"created_utc": stamp, "tables": {}}
    total = 0
    for t in tables:
        try:
            n = dump_table(sb, t, out_dir)
            manifest["tables"][t] = n
            total += n
            print(f"  {t:<24} {n:>7} rows")
        except Exception as e:
            manifest["tables"][t] = f"ERROR: {e}"
            print(f"  {t:<24} FAILED: {e}")

    (out_dir / "_manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    print(f"\nDone. {total} total rows. Snapshot: {out_dir}")


if __name__ == "__main__":
    main()
