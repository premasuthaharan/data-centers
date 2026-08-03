import json
import math

import pytest

from logic import (
    PUE,
    UTILIZATION_FACTOR,
    aggregate_impact,
    all_datacenters_with_impact,
    compute_impact,
    compute_peer_contexts,
    extract_us_state,
    get_dataset_metadata,
    grid_context,
    haversine_km,
    impact_radius_km,
    load_datacenters,
    nearest_datacenters,
    regions_with_aggregate_impact,
    water_stress_category,
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
        assert result["electricity"]["annual_kwh"] == 911_040_000
        assert result["electricity"]["price_lift_pct"] == 5.5
        assert result["electricity"]["homes_powered"] == 86766
        assert result["electricity"]["annual_cost_millions_usd"] == 75.6
        assert result["water"]["daily_withdrawal_mgd"] == 1.52
        assert result["water"]["severity"] == "moderate"
        assert result["water"]["households_equivalent"] == 5067
        assert result["carbon"]["annual_co2_tonnes"] == 346195
        assert result["carbon"]["cars_equivalent"] == 75260
        assert result["carbon"]["renewable_pct"] == 22
        assert result["carbon"]["intensity_gco2_per_kwh"] == 380
        assert result["land"]["footprint_m2"] == 10000
        assert result["land"]["waste_heat_mw"] == 30.0

    def test_annual_kwh_applies_utilization_and_pue_to_nameplate_power(self):
        # annual_kwh must equal IT load * utilization * PUE * hours/year, not
        # nameplate power_mw run at 100% continuously.
        dc = {"power_mw": 100.0}
        result = compute_impact(dc)
        expected = 100.0 * UTILIZATION_FACTOR * PUE * 1_000 * 8_760
        assert result["electricity"]["annual_kwh"] == round(expected)

    def test_waste_heat_and_annual_kwh_share_the_same_pue(self):
        # waste_heat_mw and the PUE portion of annual_kwh must derive from
        # the same PUE constant so the two figures stay internally coherent.
        power_mw = 200.0
        result = compute_impact({"power_mw": power_mw})

        assert result["land"]["waste_heat_mw"] == round(power_mw * (PUE - 1), 1)
        implied_pue = result["electricity"]["annual_kwh"] / (
            power_mw * UTILIZATION_FACTOR * 1_000 * 8_760
        )
        assert implied_pue == pytest.approx(PUE, rel=1e-6)

    def test_footprint_and_radius_are_not_derated_by_utilization(self):
        # Physical footprint and grid-share radius model nameplate/physical
        # size, not energy draw, so they must NOT be scaled by utilization.
        result = compute_impact({"power_mw": 100.0})
        assert result["land"]["footprint_m2"] == 10000
        assert result["radius_km"] == 50.0

    def test_missing_electricity_price_and_water_use_global_defaults(self):
        # Records that predate this change (no per-country rates) must fall
        # back to the previous global constants, not silently zero out.
        dc = {
            "power_mw": 100.0,
            "carbon_intensity_gco2_per_kwh": 380,
            "renewable_pct": 22,
        }
        result = compute_impact(dc)

        assert result["electricity"]["annual_cost_millions_usd"] == 54.7
        assert result["water"]["daily_withdrawal_mgd"] == 1.98

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
        assert result["water"]["households_equivalent"] == 0
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
            (100, "moderate"),    # 1.98 MGD
            (300, "high"),        # ~5.9 MGD
            (1000, "critical"),   # ~19.8 MGD
        ],
    )
    def test_water_severity_thresholds(self, power_mw, expected_severity):
        result = compute_impact({"power_mw": power_mw})
        assert result["water"]["severity"] == expected_severity

    def test_water_severity_boundary_just_under_1_mgd(self):
        # Find a power_mw that lands just under the 1 MGD boundary.
        dc = {"power_mw": 50.0}
        result = compute_impact(dc)
        assert result["water"]["daily_withdrawal_mgd"] < 1
        assert result["water"]["severity"] == "low"

    def test_water_severity_boundary_at_5_mgd(self):
        dc = {"power_mw": 253.0}
        result = compute_impact(dc)
        assert result["water"]["daily_withdrawal_mgd"] == pytest.approx(5.0, abs=0.1)

    @pytest.mark.parametrize(
        "power_mw,expected_severity",
        [
            (10, "low"),        # 2.9% lift
            (70, "moderate"),   # 5.1% lift
            (150, "high"),      # 6.0% lift
            (400, "critical"),  # 7.2% lift
        ],
    )
    def test_price_lift_severity_thresholds(self, power_mw, expected_severity):
        result = compute_impact({"power_mw": power_mw})
        assert result["electricity"]["price_lift_severity"] == expected_severity

    def test_price_lift_severity_boundary_at_5_pct(self):
        dc = {"power_mw": 63.5}
        result = compute_impact(dc)
        assert result["electricity"]["price_lift_pct"] == pytest.approx(5.0, abs=0.05)
        assert result["electricity"]["price_lift_severity"] == "moderate"

    def test_price_lift_severity_boundary_at_7_pct(self):
        dc = {"power_mw": 340.5}
        result = compute_impact(dc)
        assert result["electricity"]["price_lift_pct"] == pytest.approx(7.0, abs=0.05)
        assert result["electricity"]["price_lift_severity"] == "critical"

    def test_price_lift_severity_none_for_announced_facility(self):
        # power_mw unset (announced) always computes 0% lift, which isn't a
        # meaningful "low" signal, so severity is explicitly None.
        result = compute_impact({})
        assert result["electricity"]["price_lift_pct"] == 0
        assert result["electricity"]["price_lift_severity"] is None

    @pytest.mark.parametrize(
        "renewable_pct,expected_severity",
        [
            (8, "critical"),
            (17, "high"),
            (22, "moderate"),
            (42, "low"),
        ],
    )
    def test_renewable_severity_thresholds(self, renewable_pct, expected_severity):
        result = compute_impact({"power_mw": 100.0, "renewable_pct": renewable_pct})
        assert result["carbon"]["renewable_severity"] == expected_severity

    def test_renewable_severity_boundary_at_15_pct(self):
        dc = {"power_mw": 100.0, "renewable_pct": 15}
        result = compute_impact(dc)
        assert result["carbon"]["renewable_severity"] == "high"

    def test_renewable_severity_boundary_at_30_pct(self):
        dc = {"power_mw": 100.0, "renewable_pct": 30}
        result = compute_impact(dc)
        assert result["carbon"]["renewable_severity"] == "low"

    def test_households_equivalent_matches_mgd_over_300_gallons(self):
        dc = {"power_mw": 100.0, "water_liters_per_kwh": 2.3}
        result = compute_impact(dc)
        mgd = result["water"]["daily_withdrawal_mgd"]
        assert result["water"]["households_equivalent"] == round((mgd * 1_000_000) / 300)

    def test_default_arguments_match_pre_override_behavior(self):
        # Regression guard: calling with no overrides/pue/utilization must
        # produce identical output to calling compute_impact(dc) alone.
        dc = {
            "power_mw": 100.0,
            "carbon_intensity_gco2_per_kwh": 380,
            "renewable_pct": 22,
            "electricity_price_usd_per_kwh": 0.083,
            "water_liters_per_kwh": 2.3,
        }
        assert compute_impact(dc) == compute_impact(dc, overrides=None, pue=PUE, utilization=UTILIZATION_FACTOR)

    def test_renewable_pct_override(self):
        dc = {"power_mw": 100.0, "renewable_pct": 22}
        result = compute_impact(dc, overrides={"renewable_pct": 100})
        assert result["carbon"]["renewable_pct"] == 100

    def test_carbon_intensity_override_reduces_co2(self):
        dc = {"power_mw": 100.0, "carbon_intensity_gco2_per_kwh": 380}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, overrides={"carbon_intensity_gco2_per_kwh": 50})
        assert scenario["carbon"]["annual_co2_tonnes"] < baseline["carbon"]["annual_co2_tonnes"]
        assert scenario["carbon"]["intensity_gco2_per_kwh"] == 50

    def test_water_liters_override_reduces_withdrawal(self):
        dc = {"power_mw": 100.0, "water_liters_per_kwh": 2.3}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, overrides={"water_liters_per_kwh": 0.5})
        assert scenario["water"]["daily_withdrawal_mgd"] < baseline["water"]["daily_withdrawal_mgd"]

    def test_electricity_price_override_changes_cost(self):
        dc = {"power_mw": 100.0, "electricity_price_usd_per_kwh": 0.083}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, overrides={"electricity_price_usd_per_kwh": 0.01})
        assert scenario["electricity"]["annual_cost_millions_usd"] < baseline["electricity"]["annual_cost_millions_usd"]

    def test_stacked_overrides_all_apply(self):
        dc = {
            "power_mw": 100.0,
            "carbon_intensity_gco2_per_kwh": 380,
            "renewable_pct": 22,
            "water_liters_per_kwh": 2.3,
        }
        result = compute_impact(dc, overrides={
            "renewable_pct": 100,
            "carbon_intensity_gco2_per_kwh": 50,
            "water_liters_per_kwh": 0.5,
        })
        assert result["carbon"]["renewable_pct"] == 100
        assert result["carbon"]["intensity_gco2_per_kwh"] == 50
        assert result["water"]["daily_withdrawal_mgd"] == pytest.approx(0.33, abs=0.01)

    def test_pue_override_changes_annual_kwh_and_waste_heat(self):
        dc = {"power_mw": 100.0}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, pue=1.1)
        assert scenario["electricity"]["annual_kwh"] < baseline["electricity"]["annual_kwh"]
        assert scenario["land"]["waste_heat_mw"] < baseline["land"]["waste_heat_mw"]
        assert scenario["land"]["waste_heat_mw"] == round(100.0 * (1.1 - 1), 1)

    def test_utilization_override_changes_annual_kwh_only(self):
        dc = {"power_mw": 100.0}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, utilization=0.5)
        assert scenario["electricity"]["annual_kwh"] < baseline["electricity"]["annual_kwh"]
        # utilization does not factor into footprint/waste heat.
        assert scenario["land"]["footprint_m2"] == baseline["land"]["footprint_m2"]
        assert scenario["land"]["waste_heat_mw"] == baseline["land"]["waste_heat_mw"]


# --- Policy scenario mechanics: cost allocation, tax incentive, moratorium ---

class TestCostAllocationReform:
    def test_raises_cost_for_large_facility(self):
        dc = {"power_mw": 200.0, "electricity_price_usd_per_kwh": 0.083}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, overrides={"cost_allocation_reform": True})
        assert scenario["electricity"]["annual_cost_millions_usd"] > baseline["electricity"]["annual_cost_millions_usd"]

    def test_no_effect_below_threshold(self):
        dc = {"power_mw": 50.0, "electricity_price_usd_per_kwh": 0.083}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, overrides={"cost_allocation_reform": True})
        assert scenario["electricity"]["annual_cost_millions_usd"] == baseline["electricity"]["annual_cost_millions_usd"]

    def test_no_effect_when_not_enabled(self):
        dc = {"power_mw": 200.0, "electricity_price_usd_per_kwh": 0.083}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, overrides={})
        assert scenario["electricity"]["annual_cost_millions_usd"] == baseline["electricity"]["annual_cost_millions_usd"]


class TestTaxIncentiveRollback:
    def test_raises_cost_using_country_rate(self):
        dc = {"power_mw": 100.0, "country": "United States", "electricity_price_usd_per_kwh": 0.083}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, overrides={"tax_incentive_rollback": True})
        assert scenario["electricity"]["annual_cost_millions_usd"] == pytest.approx(
            baseline["electricity"]["annual_cost_millions_usd"] * 1.12, abs=0.1
        )

    def test_unknown_country_uses_default_rate(self):
        dc = {"power_mw": 100.0, "country": "Nowhereland", "electricity_price_usd_per_kwh": 0.083}
        baseline = compute_impact(dc)
        scenario = compute_impact(dc, overrides={"tax_incentive_rollback": True})
        assert scenario["electricity"]["annual_cost_millions_usd"] == pytest.approx(
            baseline["electricity"]["annual_cost_millions_usd"] * 1.08, abs=0.1
        )

    def test_stacks_with_cost_allocation_reform(self):
        dc = {"power_mw": 200.0, "country": "United States", "electricity_price_usd_per_kwh": 0.083}
        baseline = compute_impact(dc)
        both = compute_impact(dc, overrides={"cost_allocation_reform": True, "tax_incentive_rollback": True})
        only_tax = compute_impact(dc, overrides={"tax_incentive_rollback": True})
        assert both["electricity"]["annual_cost_millions_usd"] > only_tax["electricity"]["annual_cost_millions_usd"]
        assert both["electricity"]["annual_cost_millions_usd"] > baseline["electricity"]["annual_cost_millions_usd"]


# --- aggregate_impact ---

class TestAggregateImpact:
    def test_empty_list_returns_zeroed_totals(self):
        result = aggregate_impact([])
        assert result == {
            "facility_count": 0,
            "annual_kwh": 0,
            "annual_co2_tonnes": 0,
            "daily_withdrawal_mgd": 0,
            "annual_cost_millions_usd": 0,
            "water_severity_counts": {"low": 0, "moderate": 0, "high": 0, "critical": 0},
        }

    def test_sums_across_facilities(self):
        centers = [
            {"power_mw": 100.0, "carbon_intensity_gco2_per_kwh": 380, "electricity_price_usd_per_kwh": 0.083},
            {"power_mw": 50.0, "carbon_intensity_gco2_per_kwh": 590, "electricity_price_usd_per_kwh": 0.145},
        ]
        centers_with_impact = [{**dc, "impact": compute_impact(dc)} for dc in centers]
        result = aggregate_impact(centers_with_impact)

        assert result["facility_count"] == 2
        assert result["annual_kwh"] == sum(dc["impact"]["electricity"]["annual_kwh"] for dc in centers_with_impact)
        assert result["annual_co2_tonnes"] == sum(
            dc["impact"]["carbon"]["annual_co2_tonnes"] for dc in centers_with_impact
        )

    def test_counts_facilities_per_water_severity(self):
        centers = [{"power_mw": mw} for mw in (0.001, 100, 300, 1000)]  # low, moderate, high, critical
        centers_with_impact = [{**dc, "impact": compute_impact(dc)} for dc in centers]
        result = aggregate_impact(centers_with_impact)

        assert result["water_severity_counts"] == {"low": 1, "moderate": 1, "high": 1, "critical": 1}


# --- regions_with_aggregate_impact ---

class TestRegionsWithAggregateImpact:
    def test_groups_by_country(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        import logic

        monkeypatch.setattr(logic, "_DATA_PATH", datacenters_json_file)
        result = regions_with_aggregate_impact()

        regions = {r["region"]: r for r in result}
        assert set(regions) == {"United States", "Ireland", "Australia"}
        assert all(r["facility_count"] == 1 for r in regions.values())

    def test_region_totals_match_aggregate_impact_of_its_facilities(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        import logic

        monkeypatch.setattr(logic, "_DATA_PATH", datacenters_json_file)
        all_dcs = all_datacenters_with_impact()
        us_dcs = [dc for dc in all_dcs if dc["country"] == "United States"]
        expected = aggregate_impact(us_dcs)

        result = regions_with_aggregate_impact()
        us_region = next(r for r in result if r["region"] == "United States")

        assert {k: v for k, v in us_region.items() if k not in ("region", "area_km2")} == expected

    def test_known_country_includes_area_km2(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        import logic

        monkeypatch.setattr(logic, "_DATA_PATH", datacenters_json_file)
        result = regions_with_aggregate_impact()
        regions = {r["region"]: r for r in result}

        assert regions["United States"]["area_km2"] == logic.COUNTRY_AREA_KM2["United States"]

    def test_unknown_country_has_null_area_km2(
        self, tmp_path, monkeypatch, reset_logic_cache
    ):
        import logic

        dataset = {
            "generated_at": "2026-01-01T00:00:00+00:00",
            "data_centers": [{"id": "a", "country": "Narnia", "power_mw": 10.0}],
        }
        path = tmp_path / "datacenters.json"
        path.write_text(json.dumps(dataset))
        monkeypatch.setattr(logic, "_DATA_PATH", path)

        result = regions_with_aggregate_impact()

        assert result[0]["area_km2"] is None

    def test_multiple_facilities_in_same_region_are_grouped(
        self, tmp_path, monkeypatch, reset_logic_cache
    ):
        import logic

        dataset = {
            "generated_at": "2026-01-01T00:00:00+00:00",
            "data_centers": [
                {"id": "a", "country": "United States", "power_mw": 100.0},
                {"id": "b", "country": "United States", "power_mw": 50.0},
                {"id": "c", "country": "Ireland", "power_mw": 20.0},
            ],
        }
        path = tmp_path / "datacenters.json"
        path.write_text(json.dumps(dataset))
        monkeypatch.setattr(logic, "_DATA_PATH", path)

        result = regions_with_aggregate_impact()
        regions = {r["region"]: r for r in result}

        assert regions["United States"]["facility_count"] == 2
        assert regions["Ireland"]["facility_count"] == 1

    def test_missing_country_grouped_under_unknown(
        self, tmp_path, monkeypatch, reset_logic_cache
    ):
        import logic

        dataset = {
            "generated_at": "2026-01-01T00:00:00+00:00",
            "data_centers": [{"id": "a", "power_mw": 10.0}],
        }
        path = tmp_path / "datacenters.json"
        path.write_text(json.dumps(dataset))
        monkeypatch.setattr(logic, "_DATA_PATH", path)

        result = regions_with_aggregate_impact()

        assert result[0]["region"] == "Unknown"
        assert result[0]["facility_count"] == 1


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

    def test_peer_context_water_stress_and_grid_context_attached(
        self, datacenters_json_file, monkeypatch, reset_logic_cache
    ):
        import logic

        monkeypatch.setattr(logic, "_DATA_PATH", datacenters_json_file)
        result = all_datacenters_with_impact()
        by_id = {dc["id"]: dc for dc in result}

        # confirmed-dc: Springfield, IL -> state resolves; IL isn't in the
        # curated stress table, so the category is cleanly omitted.
        confirmed = by_id["confirmed-dc"]
        assert confirmed["impact"]["peer_context"] is not None
        assert confirmed["impact"]["peer_context"]["region_label"] == "IL"
        assert confirmed["impact"]["water"]["stress_category"] is None
        assert confirmed["impact"]["carbon"]["grid_context"] is not None

        # announced-dc: Ireland, empty address -> no US state, falls back to country region.
        announced = by_id["announced-dc"]
        assert announced["impact"]["peer_context"]["region_label"] == "Ireland"
        assert announced["impact"]["water"]["stress_category"] is None

        # far-dc: Australia, non-US address -> no state, water stress unavailable.
        far = by_id["far-dc"]
        assert far["impact"]["water"]["stress_category"] is None


# --- extract_us_state ---

class TestExtractUsState:
    def test_extracts_state_from_city_state_zip(self):
        assert extract_us_state("1 Main St, Springfield, IL 62701", "United States") == "IL"

    def test_extracts_state_from_full_state_name(self):
        assert extract_us_state("7400 USA Pkwy, Storey County, Nevada, United States", "United States") == "NV"

    def test_non_us_country_returns_none(self):
        assert extract_us_state("1 Remote Rd, Perth WA", "Australia") is None

    def test_empty_address_returns_none(self):
        assert extract_us_state("", "United States") is None

    def test_unparseable_address_returns_none(self):
        assert extract_us_state("2950 S. Litchfield Road", "United States") is None


# --- water_stress_category ---

class TestWaterStressCategory:
    def test_known_state_returns_category(self):
        assert water_stress_category("AZ") == "extremely high"

    def test_state_not_in_table_returns_none(self):
        assert water_stress_category("HI") is None

    def test_none_state_returns_none(self):
        assert water_stress_category(None) is None


# --- grid_context ---

class TestGridContext:
    def test_known_country_returns_rank_and_percentile(self):
        ctx = grid_context("Norway")
        assert ctx is not None
        assert ctx["rank"] == 1
        assert ctx["greener_than_pct"] == 100

    def test_lowest_renewable_country_ranks_last(self):
        ctx = grid_context("Singapore")
        assert ctx["rank"] == ctx["total_tracked"]
        assert ctx["greener_than_pct"] == 0

    def test_untracked_country_returns_none(self):
        assert grid_context("Atlantis") is None


# --- compute_peer_contexts ---

class TestComputePeerContexts:
    def test_percentiles_computed_across_full_population(self, fixture_dataset):
        centers = [{**dc, "impact": compute_impact(dc)} for dc in fixture_dataset["data_centers"]]
        contexts = compute_peer_contexts(centers)

        assert set(contexts.keys()) == {"confirmed-dc", "announced-dc", "far-dc"}
        # announced-dc has power_mw=None -> zero impact -> lowest percentile.
        assert contexts["announced-dc"]["water_percentile"] == 0

    def test_region_rank_groups_by_state_when_resolvable(self, fixture_dataset):
        centers = [{**dc, "impact": compute_impact(dc)} for dc in fixture_dataset["data_centers"]]
        contexts = compute_peer_contexts(centers)

        # Only one US facility in the fixture -> alone in its state group.
        assert contexts["confirmed-dc"]["region_label"] == "IL"
        assert contexts["confirmed-dc"]["water_rank_in_region"] == 1
        assert contexts["confirmed-dc"]["facilities_in_region"] == 1

    def test_region_falls_back_to_country_when_state_unresolvable(self, fixture_dataset):
        centers = [{**dc, "impact": compute_impact(dc)} for dc in fixture_dataset["data_centers"]]
        contexts = compute_peer_contexts(centers)

        assert contexts["far-dc"]["region_label"] == "Australia"


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
