import pytest

from fetch_data import (
    DEFAULT_IMPACT_RATES,
    GRID_DATA,
    IMPACT_RATES,
    MAX_GEOCODE_FAILURE_RATE,
    _jitter_country_centroid,
    _simplify_address,
    check_geocode_failure_rate,
    clean_owner,
    geocode,
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
