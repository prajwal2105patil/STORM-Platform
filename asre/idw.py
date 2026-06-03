"""
ASRE -- Inverse Distance Weighting (IDW) Station Module

Given a target asset location (lat, lon), computes:
  1. Distance from each NOAA ISD station to the asset
  2. IDW weights (power=2) across all stations within range
  3. The primary station and its confidence weight

Used by the Adjudicator to surface station_distance_km and
idw_confidence_weight in every API response -- making the
spatial argument defensible in CERC/APTEL proceedings.

Station registry covers Gujarat, Rajasthan, Maharashtra, Tamil Nadu --
the primary zones for Indian renewable energy force majeure claims.
"""

import math
from typing import Optional

# ---------------------------------------------------------------------------
# NOAA ISD Station Registry
# Coordinates verified against NCEI/WMO station databases.
# Format: station_id -> (name, lat, lon)
# ---------------------------------------------------------------------------
STATION_REGISTRY: dict[str, tuple[str, float, float]] = {
    # -- Gujarat / Kutch -----------------------------------------------------
    "42840": ("Naliya AF Base",          23.2700,  68.8300),
    "42851": ("Bhuj Airport",            23.2878,  69.6702),
    "42855": ("Kandla Airport",          23.1116,  70.1006),
    "42867": ("Ahmedabad Airport",       23.0771,  72.6347),
    "42869": ("Rajkot Airport",          22.3092,  70.7792),
    "42873": ("Surat Airport",           21.1141,  72.7416),
    "42872": ("Vadodara Airport",        22.3362,  73.2268),
    "42862": ("Okha",                    22.4667,  69.0667),
    "42863": ("Veraval",                 20.9000,  70.3667),

    # -- Rajasthan -----------------------------------------------------------
    "42801": ("Jaisalmer",               26.9000,  70.9167),
    "42809": ("Jodhpur Airport",         26.2511,  73.0489),
    "42823": ("Barmer",                  25.7500,  71.4000),
    "42824": ("Bikaner Airport",         28.0706,  73.2072),

    # -- Maharashtra ---------------------------------------------------------
    "43003": ("Mumbai Santacruz Airport",19.0883,  72.8683),
    "43014": ("Pune Airport",            18.5793,  73.9089),

    # -- Tamil Nadu ----------------------------------------------------------
    "43279": ("Chennai Airport",         12.9900,  80.1693),
    "43333": ("Ramnad",                  9.3667,   78.8333),
    "43356": ("Tirunelveli",             8.7167,   77.7000),
}

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
