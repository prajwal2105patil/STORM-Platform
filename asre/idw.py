"""
ASRE -- Inverse Distance Weighting (IDW) Station Module

Given a target asset location (lat, lon), computes:
  1. Distance from each NOAA ISD station to the asset
  2. IDW weights (power=2) across all stations within range
  3. The primary station and its confidence weight

Used by the Adjudicator to surface station_distance_km and
idw_confidence_weight in every API response -- making the
spatial argument defensible in CERC/APTEL proceedings.

Station registry is loaded dynamically from the Parquet sample at import time
so it always matches the production dataset (409 stations). Falls back to the
18-station seed list if the Parquet sample is unavailable (e.g., first install).
"""

import math
import os
from typing import Optional

# ---------------------------------------------------------------------------
# NOAA ISD Station Registry
# Loaded from local DuckDB Parquet sample at import time.
# Seed registry (18 Gujarat/Rajasthan/Maharashtra/Tamil Nadu stations) used
# if the Parquet file is not present.
# Format: station_id -> (name, lat, lon)
# ---------------------------------------------------------------------------
_SEED_REGISTRY: dict[str, tuple[str, float, float]] = {
    "426310": ("Naliya",       23.25, 68.85),
    "426340": ("Bhuj",         23.29, 69.67),
    "426380": ("Kandla",       23.15, 70.12),
    "426470": ("Ahmedabad",    23.08, 72.64),
    "427370": ("Rajkot",       22.31, 70.78),
    "428400": ("Surat",        21.20, 72.83),
    "427480": ("Vadodara",     22.33, 73.27),
    "427300": ("Okha",         22.48, 69.12),
    "429090": ("Veraval",      20.90, 70.37),
    "423280": ("Jaisalmer",    26.90, 70.92),
    "423390": ("Jodhpur",      26.25, 73.05),
    "424350": ("Barmer",       25.75, 71.38),
    "421650": ("Bikaner",      28.00, 73.30),
    "430030": ("Mumbai",       19.09, 72.87),
    "430630": ("Pune",         18.53, 73.85),
    "432790": ("Chennai",      12.99, 80.18),
    "433630": ("Ramnad",        9.28, 79.22),
    "433760": ("Tirunelveli",   8.73, 77.75),
}


def _load_registry_from_parquet() -> dict[str, tuple[str, float, float]]:
    """Load all distinct (station_id, station_name, lat, lon) rows from the
    Parquet sample. Returns the seed registry on any error."""
    _here = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(_here, "..", "data", "sample",
                             "year=*/month=*/part-0.parquet")
    try:
        import duckdb
        con = duckdb.connect(":memory:")
        rows = con.execute(
            f"""
            SELECT DISTINCT station, station_name, lat, lon
            FROM read_parquet('{data_path}', hive_partitioning = true)
            WHERE lat IS NOT NULL AND lon IS NOT NULL
            """
        ).fetchall()
        con.close()
        if not rows:
            return _SEED_REGISTRY
        registry: dict[str, tuple[str, float, float]] = {}
        for station_id, name, lat, lon in rows:
            registry[str(station_id)] = (name or str(station_id), float(lat), float(lon))
        return registry
    except Exception:
        return _SEED_REGISTRY


STATION_REGISTRY: dict[str, tuple[str, float, float]] = _load_registry_from_parquet()

# IDW range cap -- stations beyond this are excluded from weighting
MAX_RANGE_KM   = 300.0
# Primary station threshold -- stations within this are flagged PRIMARY
PRIMARY_KM     = 30.0
# IDW power parameter
IDW_POWER      = 2


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two WGS84 coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi       = math.radians(lat2 - lat1)
    dlambda    = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_idw(
    asset_lat: float,
    asset_lon: float,
    candidate_stations: Optional[list] = None,
) -> dict:
    """
    Compute IDW weights for all stations within MAX_RANGE_KM of the asset.

    Returns dict with:
        primary_station_id:     str
        primary_station_name:   str
        primary_distance_km:    float
        primary_idw_weight:     float  (0-1, fraction of total weight)
        all_stations:           list[dict]  sorted by distance
        within_primary_range:   bool  (primary station < PRIMARY_KM)
    """
    pool = candidate_stations or list(STATION_REGISTRY.keys())

    distances = []
    for sid in pool:
        if sid not in STATION_REGISTRY:
            continue
        name, slat, slon = STATION_REGISTRY[sid]
        d = _haversine(asset_lat, asset_lon, slat, slon)
        if d <= MAX_RANGE_KM:
            distances.append({
                "station_id":   sid,
                "station_name": name,
                "lat":          slat,
                "lon":          slon,
                "distance_km":  round(d, 2),
            })

    if not distances:
        return {
            "primary_station_id":   None,
            "primary_station_name": "No station within range",
            "primary_distance_km":  None,
            "primary_idw_weight":   None,
            "all_stations":         [],
            "within_primary_range": False,
        }

    distances.sort(key=lambda x: x["distance_km"])

    # IDW weights: w_i = 1 / d_i^p
    # Zero-distance guard: if the asset sits exactly on a station, that station
    # gets weight=1.0 and all others 0.0 (mathematical limit of IDW as d -> 0).
    zero_hits = [s for s in distances if s["distance_km"] == 0.0]
    if zero_hits:
        for s in distances:
            s["idw_weight"] = 1.0 if s["distance_km"] == 0.0 else 0.0
    else:
        total_weight = sum(1.0 / (s["distance_km"] ** IDW_POWER) for s in distances)
        for s in distances:
            s["idw_weight"] = round(
                (1.0 / s["distance_km"] ** IDW_POWER) / total_weight, 4
            )

    primary = distances[0]
    return {
        "primary_station_id":   primary["station_id"],
        "primary_station_name": primary["station_name"],
        "primary_distance_km":  primary["distance_km"],
        "primary_idw_weight":   primary["idw_weight"],
        "all_stations":         distances,
        "within_primary_range": primary["distance_km"] <= PRIMARY_KM,
    }


def station_distance(
    station_id: str,
    asset_lat: float,
    asset_lon: float,
) -> Optional[float]:
    """Return km distance from a known station to an asset. None if station unknown."""
    if station_id not in STATION_REGISTRY:
        return None
    _, slat, slon = STATION_REGISTRY[station_id]
    return round(_haversine(asset_lat, asset_lon, slat, slon), 2)
