"""
download_noaa.py
================
Download 11 years of NOAA ISD-Lite data (2014-2024) for 18 Indian weather stations.

ISD-Lite format: fixed-width, 8 columns
  1-4:    year (4 digits)
  6-7:    month (2 digits)
  9-10:   day (2 digits)
  12-13:  hour (2 digits)
  15-19:  air temp (×10 °C, -9999 = missing)
  21-25:  dew point (×10 °C, -9999 = missing)
  27-31:  sea level pressure (×10 hPa, -9999 = missing)
  33-37:  wind speed (×10 m/s, -9999 = missing)

Source: https://www.ncei.noaa.gov/pub/data/noaa/isd-lite/
"""

import os
import sys
from pathlib import Path
from urllib.request import urlopen
import gzip

# 18 Indian NOAA ISD stations (USAF ID format: CCCC + WBAN)
STATIONS = {
    "42182": "Jaisalmer",
    "42339": "Bikaner",
    "42367": "Jodhpur",
    "42492": "Jaipur",
    "42647": "Ahmedabad",
    "42680": "Rajkot",
    "42701": "Bhuj",
    "42867": "Surat",
    "43003": "Mumbai",
    "43057": "Pune",
    "43150": "Nagpur",
    "43285": "Hyderabad",
    "43346": "Chennai",
    "43430": "Bangalore",
    "43466": "Kochi",
    "42650": "Vadodara",
    "42971": "Bhopal",
    "43128": "Kolhapur",
}

YEARS = range(2014, 2025)  # 2014-2024
BASE_URL = "https://www.ncei.noaa.gov/pub/data/noaa/isd-lite"

def download_station_year(station_id, year, output_dir):
    """Download ISD-Lite data for a station/year and save as CSV."""
    url = f"{BASE_URL}/{year}/{station_id}-99999-{year}.gz"

    try:
        print(f"  Downloading {station_id} / {year}...", end=" ")
        with urlopen(url, timeout=10) as response:
            with gzip.GzipFile(fileobj=response) as gz:
                data = gz.read().decode('ascii')

        # Save as text
        output_file = output_dir / f"{station_id}_{year}.txt"
        with open(output_file, 'w') as f:
            f.write(data)

        lines = len(data.strip().split('\n'))
        print(f"✓ ({lines} records)")
        return True
    except Exception as e:
        print(f"✗ ({str(e)[:40]})")
        return False

def main():
    project_root = Path(__file__).parent.parent
    output_dir = project_root / "data" / "noaa_isd_raw"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("NOAA ISD-Lite Data Download (2014-2024)")
    print("=" * 70)

    total = len(STATIONS) * len(YEARS)
    success = 0

    for station_id, station_name in sorted(STATIONS.items()):
        print(f"\n{station_name} ({station_id})")
        for year in YEARS:
            if download_station_year(station_id, year, output_dir):
                success += 1

    print(f"\n{'=' * 70}")
    print(f"Downloaded {success}/{total} station-year files")
    print(f"Saved to: {output_dir}")
    print(f"{'=' * 70}")

if __name__ == "__main__":
    main()
