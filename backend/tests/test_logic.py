import math

import pytest

from logic import (
    all_datacenters_with_impact,
    compute_impact,
    get_dataset_metadata,
    haversine_km,
    impact_radius_km,
    load_datacenters,
    nearest_datacenters,
)


# --- haversine_km ---

class TestHaversineKm:
    def test_known_distance_sf_to_la(self):
        dist = haversine_km(37.7749, -122.4194, 34.0522, -118.2437)
        assert dist == pytest.approx(559.12, abs=0.5)

    def test_same_point_is_zero(self):
        assert haversine_km(10, 10, 10, 10) == 0.0

    def test_antipodal_points_is_half_earth_circumference(self):
        dist = haversine_km(0, 0, 0, 180)
        assert dist == pytest.approx(20015.09, abs=0.5)


# --- impact_radius_km ---

class TestImpactRadiusKm:
    def test_none_power_returns_flat_placeholder(self):
        assert impact_radius_km(None) == 20.0

    def test_zero_power_returns_flat_placeholder(self):
        assert impact_radius_km(0) == 20.0

    def test_normal_power_uses_sqrt_formula(self):
        # sqrt(100) * 5 = 50
        assert impact_radius_km(100) == 50.0

    def test_large_power_is_capped_at_300(self):
        assert impact_radius_km(5000) == 300

    def test_cap_boundary_just_under(self):
        # sqrt(3600) * 5 = 300, exactly at the cap
        assert impact_radius_km(3600) == 300


# --- compute_impact ---

class TestComputeImpact:
    def test_full_data_present(self):
        dc = {
            "power_mw": 100.0,
            "carbon_intensity_gco2_per_kwh": 380,
            "renewable_pct": 22,
            "electricity_price_usd_per_kwh": 0.083,
            "water_liters_per_kwh": 2.3,
        }
        result = compute_impact(dc)

        assert result["radius_km"] == 50.0
        assert result["data_status"] == "confirmed"
        assert result["electricity"]["annual_kwh"] == 876_000_000
        assert result["electricity"]["price_lift_pct"] == 5.5
        assert result["electricity"]["homes_powered"] == 83429
        assert result["electricity"]["annual_cost_millions_usd"] == 72.7
        assert result["water"]["daily_withdrawal_mgd"] == 1.46
        assert result["water"]["severity"] == "moderate"
        assert result["carbon"]["annual_co2_tonnes"] == 332880
        assert result["carbon"]["cars_equivalent"] == 72365
        assert result["carbon"]["renewable_pct"] == 22
        assert result["carbon"]["intensity_gco2_per_kwh"] == 380
        assert result["land"]["footprint_m2"] == 10000
        assert result["land"]["waste_heat_mw"] == 30.0

    def test_missing_electricity_price_and_water_use_global_defaults(self):
        # Records that predate this change (no per-country rates) must fall
        # back to the previous global constants, not silently zero out.
        dc = {
            "power_mw": 100.0,
            "carbon_intensity_gco2_per_kwh": 380,
            "renewable_pct": 22,
        }
        result = compute_impact(dc)

        assert result["electricity"]["annual_cost_millions_usd"] == 52.6
        assert result["water"]["daily_withdrawal_mgd"] == 1.9

    def test_different_countries_produce_different_water_and_cost(self):
        # Same power_mw, different per-country rates, must diverge —
        # this is the whole point of localizing these constants.
        arid_high_cost = compute_impact({
            "power_mw": 100.0,
            "electricity_price_usd_per_kwh": 0.220,
            "water_liters_per_kwh": 8.0,
        })
        cheap_wet = compute_impact({
            "power_mw": 100.0,
            "electricity_price_usd_per_kwh": 0.030,
            "water_liters_per_kwh": 1.3,
        })

        assert arid_high_cost["water"]["daily_withdrawal_mgd"] > cheap_wet["water"]["daily_withdrawal_mgd"]
        assert (
            arid_high_cost["electricity"]["annual_cost_millions_usd"]
            > cheap_wet["electricity"]["annual_cost_millions_usd"]
        )

    def test_missing_power_zeroes_out_dependent_fields(self):
        dc = {"power_mw": None}
        result = compute_impact(dc)

        assert result["radius_km"] == 20.0
        assert result["data_status"] == "announced"
        assert result["electricity"]["annual_kwh"] == 0
        assert result["electricity"]["price_lift_pct"] == 0
        assert result["electricity"]["homes_powered"] == 0
        assert result["electricity"]["annual_cost_millions_usd"] == 0
        assert result["water"]["daily_withdrawal_mgd"] == 0
        assert result["water"]["severity"] == "low"
        assert result["carbon"]["annual_co2_tonnes"] == 0
        assert result["carbon"]["cars_equivalent"] == 0
        assert result["land"]["footprint_m2"] == 0
        assert result["land"]["waste_heat_mw"] == 0

    def test_missing_carbon_and_renewable_use_defaults(self):
        dc = {"power_mw": 10.0}
        result = compute_impact(dc)

        assert result["carbon"]["intensity_gco2_per_kwh"] == 450
        assert result["carbon"]["renewable_pct"] == 25

    def test_explicit_data_status_overrides_power_derived_default(self):
        # Even with power_mw present, an explicit data_status in the input
        # dict should win over the "confirmed if power_mw else announced"
        # default.
        dc = {"power_mw": 100.0, "data_status": "announced"}
        result = compute_impact(dc)
        assert result["data_status"] == "announced"

    @pytest.mark.parametrize(
        "power_mw,expected_severity",
        [
            (0.001, "low"),       # tiny draw, well under 1 MGD
            (100, "moderate"),    # 1.9 MGD
            (300, "high"),        # ~5.7 MGD
            (1000, "critical"),   # ~19 MGD
        ],
    )
    def test_water_severity_thresholds(self, power_mw, expected_severity):
        result = compute_impact({"power_mw": power_mw})
        assert result["water"]["severity"] == expected_severity

    def test_water_severity_boundary_just_under_1_mgd(self):
        # Find a power_mw that lands just under the 1 MGD boundary.
        dc = {"power_mw": 52.0}
        result = compute_impact(dc)
        assert result["water"]["daily_withdrawal_mgd"] < 1
        assert result["water"]["severity"] == "low"

    def test_water_severity_boundary_at_5_mgd(self):
        dc = {"power_mw": 263.0}
        result = compute_impact(dc)
        assert result["water"]["daily_withdrawal_mgd"] == pytest.approx(5.0, abs=0.1)


# --- load_datacenters / get_dataset_metadata ---

class TestLoadDatacenters:
    def test_reads_generated_at_and_data_centers(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        import logic

        monkeypatch.setattr(logic, "_DATA_PATH", datacenters_json_file)
        centers = logic.load_datacenters()

        assert len(centers) == 3
        assert centers[0]["id"] == "confirmed-dc"
        assert logic.get_dataset_metadata() == {"generated_at": "2026-01-01T00:00:00+00:00"}

    def test_caches_after_first_load(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        import logic

        monkeypatch.setattr(logic, "_DATA_PATH", datacenters_json_file)
        first = logic.load_datacenters()
        # Mutate the source file; a cached second call must not pick this up.
        datacenters_json_file.write_text(
            '{"generated_at": "changed", "data_centers": []}'
        )
        second = logic.load_datacenters()

        assert second is first
        assert len(second) == 3


# --- all_datacenters_with_impact ---

class TestAllDatacentersWithImpact:
    def test_every_entry_gets_impact_merged_in(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        import logic

        monkeypatch.setattr(logic, "_DATA_PATH", datacenters_json_file)
        result = all_datacenters_with_impact()

        assert len(result) == 3
        for original, enriched in zip(logic.load_datacenters(), result):
            assert enriched["id"] == original["id"]
            assert "impact" in enriched
            assert "radius_km" in enriched["impact"]


# --- nearest_datacenters ---

class TestNearestDatacenters:
    def test_returns_closest_n_sorted_ascending(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        monkeypatch.setattr(
            __import__("logic"), "_DATA_PATH", datacenters_json_file
        )
        # Query point very close to confirmed-dc (Springfield, IL).
        result = nearest_datacenters(39.78, -89.65, n=2)

        assert len(result) == 2
        assert result[0]["id"] == "confirmed-dc"
        assert result[0]["distance_km"] < result[1]["distance_km"]
        assert result[0]["distance_km"] == pytest.approx(0.0, abs=0.1)

    def test_respects_n_param(self, datacenters_json_file, monkeypatch, reset_logic_cache):
        monkeypatch.setattr(
            __import__("logic"), "_DATA_PATH", datacenters_json_file
        )
        result = nearest_datacenters(0, 0, n=1)
        assert len(result) == 1

    def test_n_exceeding_list_length_returns_all(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        monkeypatch.setattr(
            __import__("logic"), "_DATA_PATH", datacenters_json_file
        )
        result = nearest_datacenters(0, 0, n=50)
        assert len(result) == 3

    def test_each_result_has_impact_attached(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        monkeypatch.setattr(
            __import__("logic"), "_DATA_PATH", datacenters_json_file
        )
        result = nearest_datacenters(0, 0, n=3)
        assert all("impact" in dc for dc in result)
