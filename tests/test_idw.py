"""
Tests for asre/idw.py -- IDW spatial math and station registry.
Run with: pytest tests/test_idw.py -v
"""
import math
import pytest
from asre.idw import _haversine, compute_idw, station_distance, STATION_REGISTRY, MAX_RANGE_KM


class TestHaversine:
    def test_same_point_is_zero(self):
        assert _haversine(23.0, 72.0, 23.0, 72.0) == 0.0

    def test_known_distance_ahmedabad_to_surat(self):
        # Ahmedabad (23.08, 72.64) to Surat (21.20, 72.83) ~210 km
        d = _haversine(23.08, 72.64, 21.20, 72.83)
        assert 200 < d < 220

    def test_symmetry(self):
        d1 = _haversine(23.0, 72.0, 19.0, 73.0)
        d2 = _haversine(19.0, 73.0, 23.0, 72.0)
        assert abs(d1 - d2) < 0.001

    def test_roughly_111km_per_degree_latitude(self):
        d = _haversine(0.0, 0.0, 1.0, 0.0)
        assert 110 < d < 112


class TestComputeIDW:
    def test_returns_no_station_when_far_from_all(self):
        result = compute_idw(78.0, 10.0)  # far north — no Indian station within 300 km
        assert result["primary_station_id"] is None
        assert result["all_stations"] == []

    def test_nearest_station_selected_as_primary(self):
        # Asset at Ahmedabad airport — 426470 should be nearest
        result = compute_idw(23.07, 72.63)
        assert result["primary_station_id"] == "426470"

    def test_idw_weights_sum_to_one(self):
        result = compute_idw(23.07, 72.63)
        total = sum(s["idw_weight"] for s in result["all_stations"])
        assert abs(total - 1.0) < 0.001

    def test_zero_distance_station_gets_weight_one(self):
        # Asset exactly at Ahmedabad station (23.08, 72.64)
        result = compute_idw(23.08, 72.64)
        primary = result["all_stations"][0]
        assert primary["idw_weight"] == 1.0
        for other in result["all_stations"][1:]:
            assert other["idw_weight"] == 0.0

    def test_within_primary_range_flag(self):
        result = compute_idw(23.08, 72.64)  # exactly on Ahmedabad
        assert result["within_primary_range"] is True

    def test_stations_sorted_by_distance(self):
        result = compute_idw(23.07, 72.63)
        distances = [s["distance_km"] for s in result["all_stations"]]
        assert distances == sorted(distances)

    def test_candidate_filter_respected(self):
        result = compute_idw(23.07, 72.63, candidate_stations=["426470"])
        assert len(result["all_stations"]) == 1
        assert result["primary_station_id"] == "426470"

    def test_unknown_candidate_id_silently_skipped(self):
        result = compute_idw(23.07, 72.63, candidate_stations=["INVALID999"])
        assert result["primary_station_id"] is None


class TestStationDistance:
    def test_known_station_returns_float(self):
        d = station_distance("426470", 23.07, 72.63)
        assert isinstance(d, float)
        assert d < 5  # Ahmedabad airport is <5 km from the station coords

    def test_unknown_station_returns_none(self):
        assert station_distance("000000", 23.07, 72.63) is None


class TestStationRegistry:
    def test_registry_is_nonempty(self):
        assert len(STATION_REGISTRY) >= 18

    def test_all_ids_are_numeric(self):
        for sid in STATION_REGISTRY:
            assert sid.isdigit(), f"Non-numeric station ID: {sid!r}"

    def test_all_ids_are_4_to_9_digits(self):
        for sid in STATION_REGISTRY:
            assert 4 <= len(sid) <= 9, f"Out-of-range ID length: {sid!r}"

    def test_all_coords_in_india_bounding_box(self):
        # India approx: lat 8–37, lon 68–97
        for sid, (name, lat, lon) in STATION_REGISTRY.items():
            assert 6 <= lat <= 38, f"{sid} ({name}): lat {lat} out of India bbox"
            assert 67 <= lon <= 98, f"{sid} ({name}): lon {lon} out of India bbox"

    def test_no_duplicate_ids(self):
        ids = list(STATION_REGISTRY.keys())
        assert len(ids) == len(set(ids))
