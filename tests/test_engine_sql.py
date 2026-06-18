"""
Tests for the SQL generator node in asre/engine.py.
Specifically exercises the SQL injection hardening on station_hint.
Run with: pytest tests/test_engine_sql.py -v
"""
import pytest
from asre.engine import sql_generator


def _state(station_hint=None, year=2022, month=8):
    return {
        "raw_claim":    "Test claim",
        "station_hint": station_hint,
        "asset_lat":    21.2,
        "asset_lon":    72.83,
        "intent_valid": True,
        "target_metric":  "wind_speed_ms",
        "threshold":      17.2,
        "comparator":     ">=",
        "year":           year,
        "month":          month,
        "sql_query":      None,
        "raw_result":     None,
        "exec_error":     None,
        "adjudication":   None,
        "idw_result":     None,
        "processing_ms":  None,
    }


class TestSqlGeneratorStationHintValidation:
    """All injection-risk inputs must be rejected; valid USAF IDs must pass."""

    VALID_IDS = ["426310", "4263", "426310001"]  # 6-digit, 4-digit, 9-digit

    INJECTION_INPUTS = [
        "'; DROP TABLE stations; --",
        "' OR '1'='1",
        "123abc",
        "426310'",
        " 426310",
        "426310\n",
        "426310;",
        "../../../etc/passwd",
        "UNION SELECT * FROM stations",
        "426310 OR 1=1",
    ]

    @pytest.mark.parametrize("sid", VALID_IDS)
    def test_valid_station_id_accepted(self, sid):
        result = sql_generator(_state(station_hint=sid))
        assert result["sql_query"] is not None, f"Valid ID {sid!r} was rejected"
        assert result["exec_error"] is None
        assert sid in result["sql_query"]

    @pytest.mark.parametrize("bad_input", INJECTION_INPUTS)
    def test_injection_input_rejected(self, bad_input):
        result = sql_generator(_state(station_hint=bad_input))
        assert result["sql_query"] is None, (
            f"Injection input {bad_input!r} produced SQL: {result['sql_query']!r}"
        )
        assert result["exec_error"] is not None

    def test_none_station_hint_produces_no_filter(self):
        result = sql_generator(_state(station_hint=None))
        assert result["sql_query"] is not None
        assert "AND station" not in result["sql_query"]

    def test_generated_sql_contains_partition_filters(self):
        result = sql_generator(_state(year=2022, month=8))
        sql = result["sql_query"]
        assert "year = 2022" in sql
        assert "month = 8" in sql

    def test_generated_sql_has_limit(self):
        result = sql_generator(_state())
        assert "LIMIT 10" in result["sql_query"]


class TestSqlGeneratorPartitionLaw:
    """Partition law: year AND month must ALWAYS be present."""

    def test_year_always_in_sql(self):
        for year in [2015, 2020, 2025]:
            result = sql_generator(_state(year=year))
            assert f"year = {year}" in result["sql_query"]

    def test_month_always_in_sql(self):
        for month in range(1, 13):
            result = sql_generator(_state(month=month))
            assert f"month = {month}" in result["sql_query"]
