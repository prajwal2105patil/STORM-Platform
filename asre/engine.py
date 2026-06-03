# -*- coding: utf-8 -*-
"""
DREADNOUGHT -- ASRE Core Engine v2.1
Autonomous Service Resolution Engine
LangGraph state machine: 4 nodes, zero cloud spend.

Flow: Intent Router -> SQL Generator -> Execution Cage -> Adjudicator
"""

import re
import time
import os
import duckdb
from typing import Optional, Literal
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END

from asre.idw import compute_idw, station_distance

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(_HERE, "..", "data", "sample", "year=*/month=*/part-0.parquet")

# ---------------------------------------------------------------------------
# State Definition
# ---------------------------------------------------------------------------
class ClaimState(TypedDict):
    # Input
    raw_claim:      str
    station_hint:   Optional[str]
    asset_lat:      Optional[float]
    asset_lon:      Optional[float]

    # Populated by Intent Router
    intent_valid:   bool
    target_metric:  Optional[str]
    threshold:      Optional[float]
    comparator:     Optional[str]
    year:           Optional[int]
    month:          Optional[int]
    rejection_reason: Optional[str]

    # Populated by SQL Generator
    sql_query:      Optional[str]

    # Populated by Execution Cage
    raw_result:     Optional[dict]
    exec_error:     Optional[str]

    # Populated by Adjudicator
    idw_result:     Optional[dict]
    final_output:   Optional[dict]
    resolution_ms:  Optional[int]
    _start_ms:      Optional[int]


# ---------------------------------------------------------------------------
# Node 1 -- Intent Router
# ---------------------------------------------------------------------------

METRIC_MAP = {
    # Wind
    "hurricane":         ("wind_speed_ms", ">", 32.9),
    "tropical storm":    ("wind_speed_ms", ">", 17.5),
    "gale":              ("wind_speed_ms", ">", 17.2),
    "storm force wind":  ("wind_speed_ms", ">", 24.5),
    "high wind":         ("wind_speed_ms", ">", 13.9),
    "wind":              ("wind_speed_ms", ">", 10.0),
    # Temperature
    "freezing":          ("air_temp_c",    "<",  0.0),
    "frost":             ("air_temp_c",    "<",  2.0),
    "extreme cold":      ("air_temp_c",    "<", -20.0),
    "extreme heat":      ("air_temp_c",    ">",  40.0),
    "heat wave":         ("air_temp_c",    ">",  35.0),
    # Pressure
    "low pressure":      ("sea_level_hpa", "<", 980.0),
    "deep low":          ("sea_level_hpa", "<", 960.0),
}

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

VALID_KEYWORDS = set(METRIC_MAP.keys()) | {
    "weather", "wind", "temperature", "temp", "pressure",
    "sla", "force majeure", "storm", "rain", "snow", "visibility",
}

# Human-readable threshold labels (no unicode, safe for any filesystem)
_THRESHOLD_LABELS = {
    ("wind_speed_ms", ">", 32.9):  "> 32.9 m/s (Hurricane Force, Beaufort 12)",
    ("wind_speed_ms", ">", 17.5):  "> 17.5 m/s (Tropical Storm Force, Beaufort 9)",
    ("wind_speed_ms", ">", 17.2):  "> 17.2 m/s (Gale Force, Beaufort 8)",
    ("wind_speed_ms", ">", 24.5):  "> 24.5 m/s (Storm Force, Beaufort 10)",
    ("wind_speed_ms", ">", 13.9):  "> 13.9 m/s (Near Gale, Beaufort 7)",
    ("wind_speed_ms", ">", 10.0):  "> 10.0 m/s (Fresh Breeze, Beaufort 5)",
    ("air_temp_c",    "<",  0.0):  "< 0.0 deg C (Freezing)",
    ("air_temp_c",    "<",  2.0):  "< 2.0 deg C (Frost)",
    ("air_temp_c",    "<", -20.0): "< -20.0 deg C (Extreme Cold)",
    ("air_temp_c",    ">",  40.0): "> 40.0 deg C (Extreme Heat)",
    ("air_temp_c",    ">",  35.0): "> 35.0 deg C (Heat Wave)",
    ("sea_level_hpa", "<", 980.0): "< 980.0 hPa (Deep Low Pressure)",
    ("sea_level_hpa", "<", 960.0): "< 960.0 hPa (Severe Depression)",
}

# Provenance and disclaimer -- ASCII only, no unicode section symbols
_PROVENANCE = (
    "NOAA Integrated Surface Dataset (ISD) -- US Federal Public Record. "
    "Admissible in Indian proceedings under Indian Evidence Act s74 (public documents), "
    "s78(6) (foreign official records), and IT Act 2000 s65B (electronic records). "
    "Cross-reference with IMD station data recommended for CERC filings."
)
_DISCLAIMER = (
    "Decision-support output only. Not legal advice. "
    "Filing responsibility and legal interpretation remain with engaging counsel."
)


def intent_router(state: ClaimState) -> ClaimState:
    claim = state["raw_claim"].lower().strip()

    if not any(kw in claim for kw in VALID_KEYWORDS):
        return {**state,
                "intent_valid": False,
                "rejection_reason": "Claim does not reference a weather or SLA condition."}

    metric, comparator, threshold = None, None, None
    for kw, (m, c, t) in METRIC_MAP.items():
        if kw in claim:
            metric, comparator, threshold = m, c, t
            break

    if metric is None:
        return {**state,
                "intent_valid": False,
                "rejection_reason": "Cannot map claim to a measurable weather metric."}

    year_match = re.search(r"\b(201[5-9]|202[0-9])\b", claim)
    year = int(year_match.group()) if year_match else None

    month = None
    for name, num in MONTH_MAP.items():
        if name in claim:
            month = num
            break
    if month is None:
        m2 = re.search(r"\b(0?[1-9]|1[0-2])[/\-](20[12][0-9])\b", claim)
        if m2:
            month = int(m2.group(1))

    if year is None or month is None:
        return {**state,
                "intent_valid": False,
                "rejection_reason": "Could not extract a valid year and month from the claim. "
                                    "Example format: 'August 2023'."}

    return {**state,
            "intent_valid": True,
            "target_metric": metric,
            "comparator": comparator,
            "threshold": threshold,
            "year": year,
            "month": month,
            "rejection_reason": None}


# ---------------------------------------------------------------------------
# Node 2 -- SQL Generator
# ---------------------------------------------------------------------------

def sql_generator(state: ClaimState) -> ClaimState:
    metric     = state["target_metric"]
    comparator = state["comparator"]
    threshold  = state["threshold"]
    year       = state["year"]
    month      = state["month"]
    station    = state.get("station_hint")

    station_clause = ""
    if station:
        station_clause = "AND station = '%s'" % station

    sql = """
SELECT
    station,
    station_name,
    COUNT(*) FILTER (WHERE {metric} {comparator} {threshold})  AS threshold_exceedance_count,
    MAX({metric})                                               AS recorded_peak,
    MIN({metric})                                               AS recorded_min,
    AVG({metric})                                               AS period_average,
    MIN(sea_level_hpa)                                          AS min_pressure_hpa,
    COUNT(*)                                                    AS total_observations
FROM read_parquet('{data_path}', hive_partitioning = true)
WHERE year = {year}
  AND month = {month}
  {station_clause}
GROUP BY station, station_name
HAVING COUNT(*) FILTER (WHERE {metric} {comparator} {threshold}) > 0
ORDER BY threshold_exceedance_count DESC
LIMIT 10
""".format(
        metric=metric,
        comparator=comparator,
        threshold=threshold,
        data_path=DATA_PATH,
        year=year,
        month=month,
        station_clause=station_clause,
    ).strip()

    return {**state, "sql_query": sql}


# ---------------------------------------------------------------------------
# Node 3 -- Execution Cage (Pool-backed, thread-safe)
# ---------------------------------------------------------------------------

def execution_cage(state: ClaimState) -> ClaimState:
    sql = state["sql_query"]
    try:
        from asre.pool import DB_POOL
        with DB_POOL.acquire(timeout=9.0) as con:
            df = con.execute(sql).df()

        if df.empty:
            return {**state,
                    "raw_result": {"rows": [], "count": 0},
                    "exec_error": None}

        rows = df.to_dict(orient="records")
        return {**state,
                "raw_result": {"rows": rows, "count": len(rows)},
                "exec_error": None}

    except Exception as e:
        return {**state,
                "raw_result": None,
                "exec_error": str(e)}


# ---------------------------------------------------------------------------
# Node 4 -- Adjudicator
# ---------------------------------------------------------------------------

def adjudicator(state: ClaimState) -> ClaimState:
    elapsed = int(time.time() * 1000) - state["_start_ms"]

    # Compute threshold label (safe ASCII, no unicode symbols)
    # Guard: threshold may be None if intent was rejected (non-weather claim / no date)
    _threshold_val = state.get("threshold")
    if _threshold_val is None:
        threshold_label = "--"
    else:
        metric_key = (state.get("target_metric"), state.get("comparator"), _threshold_val)
        threshold_label = _THRESHOLD_LABELS.get(
            metric_key,
            "%s %.1f" % (state.get("comparator", ""), _threshold_val)
        )

    # IDW computation: real math, not hardcoded
    idw_data = None
    asset_lat = state.get("asset_lat")
    asset_lon = state.get("asset_lon")
    if asset_lat is not None and asset_lon is not None:
        idw_data = compute_idw(asset_lat, asset_lon)

    def _idw_block(station_id):
        if idw_data:
            return {
                "primary_station_id":     idw_data["primary_station_id"],
                "primary_station_name":   idw_data["primary_station_name"],
                "primary_distance_km":    idw_data["primary_distance_km"],
                "idw_confidence_weight":  idw_data["primary_idw_weight"],
                "within_primary_range":   idw_data["within_primary_range"],
                "station_count_in_model": len(idw_data["all_stations"]),
            }
        return {
            "primary_station_id":     station_id,
            "primary_station_name":   None,
            "primary_distance_km":    None,
            "idw_confidence_weight":  None,
            "within_primary_range":   None,
            "station_count_in_model": 1,
        }

    # Intent rejection path
    if not state["intent_valid"]:
        output = {
            "claim_status":       "REJECTED",
            "resolution_time_ms": elapsed,
            "evidence":           None,
            "rejection_reason":   state.get("rejection_reason"),
            "data_provenance":    _PROVENANCE,
            "disclaimer":         _DISCLAIMER,
        }
        return {**state, "final_output": output, "idw_result": idw_data, "resolution_ms": elapsed}

    # Null Island guard: asset coords provided but zero stations within range
    if idw_data is not None and len(idw_data.get("all_stations", [])) == 0:
        output = {
            "claim_status":       "INSUFFICIENT_DATA",
            "resolution_time_ms": elapsed,
            "evidence":           None,
            "rejection_reason":   (
                "No NOAA ISD station within 300 km of the provided asset coordinates. "
                "Spatial adjudication requires at least one station within range."
            ),
            "data_provenance":    _PROVENANCE,
            "disclaimer":         _DISCLAIMER,
        }
        return {**state, "final_output": output, "idw_result": idw_data, "resolution_ms": elapsed}

    # Execution error path
    if state.get("exec_error"):
        output = {
            "claim_status":       "INSUFFICIENT_DATA",
            "resolution_time_ms": elapsed,
            "evidence":           None,
            "rejection_reason":   state["exec_error"],
            "data_provenance":    _PROVENANCE,
            "disclaimer":         _DISCLAIMER,
        }
        return {**state, "final_output": output, "idw_result": idw_data, "resolution_ms": elapsed}

    result = state["raw_result"]

    if result["count"] == 0:
        output = {
            "claim_status":       "REJECTED",
            "resolution_time_ms": elapsed,
            "evidence": {
                "target_metric":          state["target_metric"],
                "threshold_applied":      threshold_label,
                "recorded_peak":          None,
                "sla_threshold_exceeded": False,
                "exceedance_hours":       0,
                **_idw_block(state.get("station_hint")),
            },
            "data_provenance":    _PROVENANCE,
            "disclaimer":         _DISCLAIMER,
        }
        return {**state, "final_output": output, "idw_result": idw_data, "resolution_ms": elapsed}

    # VALIDATED
    top = result["rows"][0]
    output = {
        "claim_status":       "VALIDATED",
        "resolution_time_ms": elapsed,
        "evidence": {
            "target_metric":          state["target_metric"],
            "threshold_applied":      threshold_label,
            "recorded_peak":          round(float(top["recorded_peak"]), 2),
            "period_average":         round(float(top["period_average"]), 2),
            "exceedance_hours":       int(top["threshold_exceedance_count"]),
            "total_observations":     int(top["total_observations"]),
            "station":                top["station"],
            "station_name":           top["station_name"],
            "sla_threshold_exceeded": True,
            **_idw_block(top["station"]),
        },
        "data_provenance":    _PROVENANCE,
        "disclaimer":         _DISCLAIMER,
    }
    return {**state, "final_output": output, "idw_result": idw_data, "resolution_ms": elapsed}


# ---------------------------------------------------------------------------
# Routing logic
# ---------------------------------------------------------------------------

def route_after_intent(state: ClaimState) -> Literal["sql_generator", "adjudicator"]:
    return "sql_generator" if state["intent_valid"] else "adjudicator"

def route_after_sql(state: ClaimState) -> Literal["execution_cage", "adjudicator"]:
    return "execution_cage" if state.get("sql_query") else "adjudicator"


# ---------------------------------------------------------------------------
# Graph Assembly
# ---------------------------------------------------------------------------

def build_graph():
    g = StateGraph(ClaimState)
    g.add_node("intent_router",  intent_router)
    g.add_node("sql_generator",  sql_generator)
    g.add_node("execution_cage", execution_cage)
    g.add_node("adjudicator",    adjudicator)
    g.set_entry_point("intent_router")
    g.add_conditional_edges("intent_router", route_after_intent, {
        "sql_generator": "sql_generator",
        "adjudicator":   "adjudicator",
    })
    g.add_conditional_edges("sql_generator", route_after_sql, {
        "execution_cage": "execution_cage",
        "adjudicator":    "adjudicator",
    })
    g.add_edge("execution_cage", "adjudicator")
    g.add_edge("adjudicator", END)
    return g.compile()


# Singleton -- compiled once at import
ASRE_GRAPH = build_graph()


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def resolve_claim(
    raw_claim:    str,
    station_hint: Optional[str]   = None,
    asset_lat:    Optional[float] = None,
    asset_lon:    Optional[float] = None,
) -> dict:
    initial_state: ClaimState = {
        "raw_claim":         raw_claim,
        "station_hint":      station_hint,
        "asset_lat":         asset_lat,
        "asset_lon":         asset_lon,
        "intent_valid":      False,
        "target_metric":     None,
        "threshold":         None,
        "comparator":        None,
        "year":              None,
        "month":             None,
        "rejection_reason":  None,
        "sql_query":         None,
        "raw_result":        None,
        "exec_error":        None,
        "idw_result":        None,
        "final_output":      None,
        "resolution_ms":     None,
        "_start_ms":         int(time.time() * 1000),
    }
    result = ASRE_GRAPH.invoke(initial_state)
    return result["final_output"]
