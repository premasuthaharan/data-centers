import json

import pytest

import fetch_data
from fetch_data import (
    DEFAULT_IMPACT_RATES,
    GRID_DATA,
    IMPACT_RATES,
    MAX_GEOCODE_FAILURE_RATE,
    PRECISION_RANK,
    _jitter_country_centroid,
    _simplify_address,
    apply_regression_guard,
    check_geocode_failure_rate,
    clean_owner,
    geocode,
    load_existing_datacenters,
    load_location_overrides,
    parse_float,
)
from logic import haversine_km


# --- _simplify_address ---

class TestSimplifyAddress:
    def test_extracts_city_before_state_zip(self):
        assert _simplify_address("5420 Tulane Rd, Memphis, TN 38109") == "Memphis, TN"

    def test_extracts_city_before_bare_state(self):
        assert _simplify_address("Somewhere, WY") == "Somewhere, WY"

    def test_street_prefix_not_misparsed_as_state(self):
        # "Co Rd 42" must not be mistaken for a 2-letter state code.
        result = _simplify_address("123 Co Rd 42, Prattville, AL 36105")
        assert result == "Prattville, AL"

    def test_single_part_falls_back_to_full_address(self):
        assert _simplify_address("JustOnePart") == "JustOnePart"

    def test_no_state_pattern_falls_back_to_last_two_parts(self):
        assert _simplify_address("Part1, Part2, Part3") == "Part2, Part3"


# --- _jitter_country_centroid ---

class TestJitterCountryCentroid:
    def test_deterministic_for_same_facility_id(self):
        p1 = _jitter_country_centroid(53.35, -6.26, "facility-a")
        p2 = _jitter_country_centroid(53.35, -6.26, "facility-a")
        assert p1 == p2

    def test_different_facility_ids_produce_different_offsets(self):
        p1 = _jitter_country_centroid(53.35, -6.26, "facility-a")
        p2 = _jitter_country_centroid(53.35, -6.26, "facility-b")
        assert p1 != p2

    def test_output_stays_within_radius_of_centroid(self):
        lat, lng = 53.35, -6.26
        jlat, jlng = _jitter_country_centroid(lat, lng, "facility-a", radius_km=40)
        dist = haversine_km(lat, lng, jlat, jlng)
        assert dist <= 40


# --- IMPACT_RATES ---

class TestImpactRates:
    def test_every_grid_data_country_has_impact_rates(self):
        # Every country we already model grid carbon for should also have
        # localized price/water rates, not silently fall back to defaults.
        missing = set(GRID_DATA) - set(IMPACT_RATES)
        assert missing == set()

    def test_default_matches_previous_global_constants(self):
        # The fallback for countries missing from the table must equal the
        # old hardcoded 0.06 / 3.0 constants so pre-existing behavior for
        # unmapped countries doesn't silently change.
        assert DEFAULT_IMPACT_RATES == {
            "electricity_price_usd_per_kwh": 0.06,
            "water_liters_per_kwh": 3.0,
        }

    def test_rates_vary_by_country(self):
        us = IMPACT_RATES["United States"]
        uae = IMPACT_RATES["United Arab Emirates"]
        assert us["electricity_price_usd_per_kwh"] != uae["electricity_price_usd_per_kwh"]
        assert us["water_liters_per_kwh"] != uae["water_liters_per_kwh"]


# --- clean_owner ---

class TestCleanOwner:
    def test_strips_confidence_tags(self):
        assert clean_owner("Amazon #confident") == "Amazon"

    def test_empty_string_returns_unknown(self):
        assert clean_owner("") == "Unknown"

    def test_none_returns_unknown(self):
        assert clean_owner(None) == "Unknown"

    def test_multiple_owners_preserved(self):
        assert clean_owner("Amazon #confident, Meta #likely") == "Amazon, Meta"


# --- parse_float ---

class TestParseFloat:
    def test_valid_numeric_string(self):
        assert parse_float("12.5") == 12.5

    def test_invalid_string_returns_default(self):
        assert parse_float("abc", default=0) == 0

    def test_none_returns_default(self):
        assert parse_float(None, default=None) is None

    def test_default_defaults_to_none(self):
        assert parse_float("not-a-number") is None


# --- geocode ---

class TestGeocode:
    def test_address_tier_succeeds(self, monkeypatch):
        import fetch_data

        monkeypatch.setattr(fetch_data, "_nominatim_query", lambda q: (1.0, 2.0))
        monkeypatch.setattr(fetch_data.time, "sleep", lambda s: None)

        result = geocode("123 Main St, Springfield", "United States")
        assert result == (1.0, 2.0, "address")

    def test_falls_back_to_approximate_tier(self, monkeypatch):
        import fetch_data

        calls = []

        def fake_query(q):
            calls.append(q)
            # Fail the first ("address") tier, succeed on the second
            # ("approximate") tier.
            return None if len(calls) == 1 else (3.0, 4.0)

        monkeypatch.setattr(fetch_data, "_nominatim_query", fake_query)
        monkeypatch.setattr(fetch_data.time, "sleep", lambda s: None)

        result = geocode("123 Main St, Springfield, IL 62701", "United States")
        assert result == (3.0, 4.0, "approximate")

    def test_falls_back_to_country_tier(self, monkeypatch):
        import fetch_data

        call_count = {"n": 0}

        def fake_query(q):
            call_count["n"] += 1
            if call_count["n"] < 3:
                return None
            return (5.0, 6.0)

        monkeypatch.setattr(fetch_data, "_nominatim_query", fake_query)
        monkeypatch.setattr(fetch_data.time, "sleep", lambda s: None)

        result = geocode("Some Address", "Wonderland")
        assert result == (5.0, 6.0, "country")

    def test_all_tiers_fail_returns_none(self, monkeypatch):
        import fetch_data

        monkeypatch.setattr(fetch_data, "_nominatim_query", lambda q: None)
        monkeypatch.setattr(fetch_data.time, "sleep", lambda s: None)

        result = geocode("Nowhere", "Nowhereland")
        assert result is None

    def test_empty_address_only_tries_country_tier(self, monkeypatch):
        import fetch_data

        calls = []

        def fake_query(q):
            calls.append(q)
            return (7.0, 8.0)

        monkeypatch.setattr(fetch_data, "_nominatim_query", fake_query)
        monkeypatch.setattr(fetch_data.time, "sleep", lambda s: None)

        result = geocode("", "Atlantis")
        assert result == (7.0, 8.0, "country")
        assert calls == ["Atlantis"]


# --- check_geocode_failure_rate ---

def _make_results(n_ok: int, n_failed: int) -> list[dict]:
    return (
        [{"geocode_precision": "address"} for _ in range(n_ok)]
        + [{"geocode_precision": "failed"} for _ in range(n_failed)]
    )


class TestCheckGeocodeFailureRate:
    def test_no_results_raises(self):
        with pytest.raises(RuntimeError, match="No entries were parsed"):
            check_geocode_failure_rate([])

    def test_failure_rate_under_threshold_does_not_raise(self):
        # 1/10 = 10%, under the 20% threshold.
        check_geocode_failure_rate(_make_results(n_ok=9, n_failed=1))

    def test_failure_rate_at_threshold_does_not_raise(self):
        # 2/10 = 20%, exactly at (not over) the threshold.
        results = _make_results(n_ok=8, n_failed=2)
        assert MAX_GEOCODE_FAILURE_RATE == 0.20
        check_geocode_failure_rate(results)

    def test_failure_rate_over_threshold_raises(self):
        # 3/10 = 30%, over the 20% threshold.
        with pytest.raises(RuntimeError, match="exceeding the 20% threshold"):
            check_geocode_failure_rate(_make_results(n_ok=7, n_failed=3))

    def test_all_failed_raises(self):
        with pytest.raises(RuntimeError, match="exceeding the 20% threshold"):
            check_geocode_failure_rate(_make_results(n_ok=0, n_failed=5))


# --- main() snapshot writing ---

SAMPLE_CSV = (
    "Name,Owner,Country,Address,Current power (MW),"
    "Current total capital cost (2025 USD billions)\n"
    "Test DC,Amazon #confident,United States,"
    "1 Main St, Springfield, IL 62701,100,2.5\n"
)


class TestMainWritesSnapshot:
    def test_writes_datacenters_json_and_matching_dated_snapshot(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        (tmp_path / "data").mkdir()
        monkeypatch.setattr(fetch_data, "fetch_csv", lambda url: SAMPLE_CSV)
        monkeypatch.setattr(fetch_data, "geocode", lambda address, country: (1.0, 2.0, "address"))

        fetch_data.main()

        main_output = json.loads((tmp_path / "data" / "datacenters.json").read_text())
        snapshots_dir = tmp_path / "data" / "snapshots"
        snapshot_files = list(snapshots_dir.glob("*.json"))

        assert len(snapshot_files) == 1
        snapshot_output = json.loads(snapshot_files[0].read_text())
        assert snapshot_output == main_output
        assert snapshot_files[0].stem == main_output["generated_at"][:10]

    def test_rerunning_same_day_overwrites_snapshot_without_duplicating(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        (tmp_path / "data").mkdir()
        monkeypatch.setattr(fetch_data, "fetch_csv", lambda url: SAMPLE_CSV)
        monkeypatch.setattr(fetch_data, "geocode", lambda address, country: (1.0, 2.0, "address"))

        fetch_data.main()
        fetch_data.main()

        snapshots_dir = tmp_path / "data" / "snapshots"
        snapshot_files = list(snapshots_dir.glob("*.json"))
        assert len(snapshot_files) == 1


# --- load_location_overrides / load_existing_datacenters ---

class TestLoadLocationOverrides:
    def test_missing_file_returns_empty_dict(self, tmp_path):
        assert load_location_overrides(str(tmp_path / "nope.json")) == {}

    def test_loads_existing_file(self, tmp_path):
        overrides_path = tmp_path / "location_overrides.json"
        overrides_path.write_text(json.dumps({"some-id": {"address": "Some Place"}}))
        assert load_location_overrides(str(overrides_path)) == {
            "some-id": {"address": "Some Place"}
        }


class TestLoadExistingDatacenters:
    def test_missing_file_returns_empty_dict(self, tmp_path):
        assert load_existing_datacenters(str(tmp_path / "nope.json")) == {}

    def test_loads_and_keys_by_id(self, tmp_path):
        path = tmp_path / "datacenters.json"
        path.write_text(json.dumps({
            "data_centers": [
                {"id": "facility-a", "geocode_precision": "address"},
                {"id": "facility-b", "geocode_precision": "country"},
            ]
        }))
        result = load_existing_datacenters(str(path))
        assert set(result) == {"facility-a", "facility-b"}
        assert result["facility-a"]["geocode_precision"] == "address"


# --- apply_regression_guard ---

class TestApplyRegressionGuard:
    def test_preserves_existing_when_fresh_run_regresses(self):
        fresh = [{
            "id": "facility-a", "lat": 1.0, "lng": 1.0,
            "geocode_precision": "country", "address": "",
        }]
        existing = {"facility-a": {
            "lat": 9.0, "lng": 9.0, "geocode_precision": "address", "address": "9 Real St",
        }}

        guarded = apply_regression_guard(fresh, existing)

        assert guarded[0]["lat"] == 9.0
        assert guarded[0]["lng"] == 9.0
        assert guarded[0]["geocode_precision"] == "address"
        assert guarded[0]["address"] == "9 Real St"

    def test_allows_improvement_over_existing(self):
        fresh = [{
            "id": "facility-a", "lat": 9.0, "lng": 9.0,
            "geocode_precision": "address", "address": "9 Real St",
        }]
        existing = {"facility-a": {
            "lat": 1.0, "lng": 1.0, "geocode_precision": "country", "address": "",
        }}

        guarded = apply_regression_guard(fresh, existing)

        assert guarded[0]["lat"] == 9.0
        assert guarded[0]["geocode_precision"] == "address"

    def test_matching_precision_passes_fresh_through(self):
        fresh = [{
            "id": "facility-a", "lat": 5.0, "lng": 5.0,
            "geocode_precision": "approximate", "address": "New City",
        }]
        existing = {"facility-a": {
            "lat": 4.0, "lng": 4.0, "geocode_precision": "approximate", "address": "Old City",
        }}

        guarded = apply_regression_guard(fresh, existing)

        assert guarded[0]["lat"] == 5.0
        assert guarded[0]["address"] == "New City"

    def test_id_not_in_existing_passes_through_unchanged(self):
        fresh = [{
            "id": "new-facility", "lat": 5.0, "lng": 5.0,
            "geocode_precision": "country", "address": "",
        }]

        guarded = apply_regression_guard(fresh, existing_by_id={})

        assert guarded == fresh

    def test_precision_rank_orders_address_above_approximate_above_country_above_failed(self):
        assert PRECISION_RANK["address"] > PRECISION_RANK["approximate"]
        assert PRECISION_RANK["approximate"] > PRECISION_RANK["country"]
        assert PRECISION_RANK["country"] > PRECISION_RANK["failed"]
        assert PRECISION_RANK["failed"] == PRECISION_RANK[None]


# --- main() with overrides and regression guard ---

class TestMainWithOverridesAndRegressionGuard:
    def test_override_is_applied_and_produces_expected_precision(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        (tmp_path / "data").mkdir()
        (tmp_path / "data" / "location_overrides.json").write_text(json.dumps({
            "test-dc": {
                "address": "Researched Location, Somewhere",
                "lat": 42.0,
                "lng": -71.0,
                "geocode_precision": "approximate",
            }
        }))
        monkeypatch.setattr(fetch_data, "fetch_csv", lambda url: SAMPLE_CSV)

        queries_seen = []

        def fake_geocode(address, country):
            queries_seen.append(address)
            if address == "Researched Location, Somewhere":
                return (42.0, -71.0, "approximate")
            return (1.0, 2.0, "address")

        monkeypatch.setattr(fetch_data, "geocode", fake_geocode)

        fetch_data.main()

        output = json.loads((tmp_path / "data" / "datacenters.json").read_text())
        record = output["data_centers"][0]
        assert record["id"] == "test-dc"
        assert record["geocode_precision"] == "approximate"
        assert record["lat"] == 42.0
        assert record["lng"] == -71.0
        # The override's researched address is what got geocoded, not the raw CSV address.
        assert queries_seen[0] == "Researched Location, Somewhere"

    def test_existing_better_precision_is_preserved_not_overwritten(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        (tmp_path / "data").mkdir()
        (tmp_path / "data" / "datacenters.json").write_text(json.dumps({
            "generated_at": "2026-01-01T00:00:00+00:00",
            "data_centers": [{
                "id": "test-dc",
                "name": "Test DC",
                "lat": 39.5,
                "lng": -89.6,
                "geocode_precision": "address",
                "address": "1 Main St, Springfield, IL 62701",
            }],
        }))
        monkeypatch.setattr(fetch_data, "fetch_csv", lambda url: SAMPLE_CSV)
        # Simulate a fresh run that would only achieve country-level precision this time.
        monkeypatch.setattr(fetch_data, "geocode", lambda address, country: (39.0, -98.0, "country"))

        fetch_data.main()

        output = json.loads((tmp_path / "data" / "datacenters.json").read_text())
        record = output["data_centers"][0]
        assert record["geocode_precision"] == "address"
        assert record["lat"] == 39.5
        assert record["lng"] == -89.6

    def test_fresh_run_improving_on_existing_country_precision_does_update(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        (tmp_path / "data").mkdir()
        (tmp_path / "data" / "datacenters.json").write_text(json.dumps({
            "generated_at": "2026-01-01T00:00:00+00:00",
            "data_centers": [{
                "id": "test-dc",
                "name": "Test DC",
                "lat": 39.0,
                "lng": -98.0,
                "geocode_precision": "country",
                "address": "",
            }],
        }))
        monkeypatch.setattr(fetch_data, "fetch_csv", lambda url: SAMPLE_CSV)
        monkeypatch.setattr(fetch_data, "geocode", lambda address, country: (39.5, -89.6, "address"))

        fetch_data.main()

        output = json.loads((tmp_path / "data" / "datacenters.json").read_text())
        record = output["data_centers"][0]
        assert record["geocode_precision"] == "address"
        assert record["lat"] == 39.5
        assert record["lng"] == -89.6

    def test_first_ever_run_with_no_existing_datacenters_json_does_not_error(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        (tmp_path / "data").mkdir()
        assert not (tmp_path / "data" / "datacenters.json").exists()
        monkeypatch.setattr(fetch_data, "fetch_csv", lambda url: SAMPLE_CSV)
        monkeypatch.setattr(fetch_data, "geocode", lambda address, country: (1.0, 2.0, "address"))

        fetch_data.main()

        output = json.loads((tmp_path / "data" / "datacenters.json").read_text())
        assert output["data_centers"][0]["geocode_precision"] == "address"
