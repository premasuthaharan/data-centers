import json
import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(datacenters_json_file, monkeypatch, reset_logic_cache):
    import logic

    monkeypatch.setattr(logic, "_DATA_PATH", datacenters_json_file)

    import main

    return TestClient(main.app)


# --- GET /api/datacenters ---

class TestGetAll:
    def test_returns_generated_at_and_enriched_data_centers(self, client):
        resp = client.get("/api/datacenters")

        assert resp.status_code == 200
        body = resp.json()
        assert body["generated_at"] == "2026-01-01T00:00:00+00:00"
        assert len(body["data_centers"]) == 3
        assert all("impact" in dc for dc in body["data_centers"])


# --- GET /api/regions ---

class TestGetRegions:
    def test_groups_by_country_with_one_facility_each(self, client):
        resp = client.get("/api/regions")

        assert resp.status_code == 200
        body = resp.json()
        regions = {r["region"]: r for r in body}
        assert set(regions) == {"United States", "Ireland", "Australia"}
        assert all(r["facility_count"] == 1 for r in regions.values())

    def test_region_totals_match_manually_summed_impact(self, client):
        import logic

        all_dcs = logic.all_datacenters_with_impact()
        us_dc = next(dc for dc in all_dcs if dc["country"] == "United States")

        resp = client.get("/api/regions")
        us_region = next(r for r in resp.json() if r["region"] == "United States")

        assert us_region["annual_co2_tonnes"] == us_dc["impact"]["carbon"]["annual_co2_tonnes"]
        assert us_region["annual_kwh"] == us_dc["impact"]["electricity"]["annual_kwh"]
        assert us_region["daily_withdrawal_mgd"] == us_dc["impact"]["water"]["daily_withdrawal_mgd"]

    def test_includes_area_km2_for_known_countries(self, client):
        resp = client.get("/api/regions")
        regions = {r["region"]: r for r in resp.json()}

        assert regions["United States"]["area_km2"] == 9_147_420
        assert regions["Ireland"]["area_km2"] == 68_883
        assert regions["Australia"]["area_km2"] == 7_682_300


# --- GET /api/datacenters/nearest ---

class TestGetNearest:
    def test_requires_lat_and_lng(self, client):
        resp = client.get("/api/datacenters/nearest")
        assert resp.status_code == 422

    def test_missing_lng_only(self, client):
        resp = client.get("/api/datacenters/nearest", params={"lat": 39.78})
        assert resp.status_code == 422

    def test_default_n_is_3(self, client):
        resp = client.get("/api/datacenters/nearest", params={"lat": 39.78, "lng": -89.65})
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_n_below_minimum_rejected(self, client):
        resp = client.get(
            "/api/datacenters/nearest", params={"lat": 0, "lng": 0, "n": 0}
        )
        assert resp.status_code == 422

    def test_n_above_maximum_rejected(self, client):
        resp = client.get(
            "/api/datacenters/nearest", params={"lat": 0, "lng": 0, "n": 21}
        )
        assert resp.status_code == 422

    def test_n_within_bounds_accepted(self, client):
        resp = client.get(
            "/api/datacenters/nearest", params={"lat": 0, "lng": 0, "n": 2}
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2


# --- GET /api/locate ---

class TestLocate:
    def test_success_returns_lat_lng_city_country(self, client, monkeypatch):
        import main

        def fake_geolocate_ip(ip):
            return {
                "status": "success",
                "lat": 51.5074,
                "lon": -0.1278,
                "city": "London",
                "country": "United Kingdom",
                "countryCode": "GB",
            }

        monkeypatch.setattr(main, "geolocate_ip", fake_geolocate_ip)

        resp = client.get("/api/locate", params={"ip": "1.2.3.4"})

        assert resp.status_code == 200
        assert resp.json() == {
            "lat": 51.5074,
            "lng": -0.1278,
            "city": "London",
            "country": "United Kingdom",
        }

    def test_missing_ip_param_falls_back_to_request_ip(self, client, monkeypatch):
        import main

        captured = {}

        def fake_geolocate_ip(ip):
            captured["ip"] = ip
            return {
                "status": "success",
                "lat": 1.0,
                "lon": 2.0,
                "city": "Testville",
                "country": "Testland",
                "countryCode": "TT",
            }

        monkeypatch.setattr(main, "geolocate_ip", fake_geolocate_ip)

        resp = client.get("/api/locate")

        assert resp.status_code == 200
        assert captured["ip"] == "testclient"

    def test_missing_ip_param_uses_x_forwarded_for(self, client, monkeypatch):
        import main

        captured = {}

        def fake_geolocate_ip(ip):
            captured["ip"] = ip
            return {
                "status": "success",
                "lat": 1.0,
                "lon": 2.0,
                "city": "Testville",
                "country": "Testland",
                "countryCode": "TT",
            }

        monkeypatch.setattr(main, "geolocate_ip", fake_geolocate_ip)

        resp = client.get(
            "/api/locate", headers={"x-forwarded-for": "9.9.9.9, 8.8.8.8"}
        )

        assert resp.status_code == 200
        assert captured["ip"] == "9.9.9.9"

    def test_upstream_failure_returns_502(self, client, monkeypatch):
        import main

        def fake_geolocate_ip(ip):
            raise ValueError("ip-api failed: {'status': 'fail', 'message': 'invalid query'}")

        monkeypatch.setattr(main, "geolocate_ip", fake_geolocate_ip)

        resp = client.get("/api/locate", params={"ip": "not-an-ip"})

        assert resp.status_code == 502
        assert "invalid query" in resp.json()["detail"]


# --- POST /api/scenario ---

class TestScenario:
    def test_no_facility_ids_applies_to_all(self, client):
        resp = client.post("/api/scenario", json={"scenario": {"renewable_pct": 100}})

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data_centers"]) == 3
        assert all(dc["impact"]["carbon"]["renewable_pct"] == 100 for dc in body["data_centers"])
        assert body["baseline_totals"]["facility_count"] == 3
        assert body["scenario_totals"]["facility_count"] == 3

    def test_facility_ids_subset(self, client):
        resp = client.post(
            "/api/scenario",
            json={"scenario": {"renewable_pct": 100}, "facility_ids": ["confirmed-dc"]},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data_centers"]) == 1
        assert body["data_centers"][0]["id"] == "confirmed-dc"
        assert body["baseline_totals"]["facility_count"] == 1

    def test_unknown_facility_id_returns_404(self, client):
        resp = client.post(
            "/api/scenario",
            json={"scenario": {"renewable_pct": 100}, "facility_ids": ["does-not-exist"]},
        )
        assert resp.status_code == 404

    def test_empty_override_body_returns_unchanged_totals(self, client):
        resp = client.post("/api/scenario", json={"scenario": {}})

        assert resp.status_code == 200
        body = resp.json()
        assert body["baseline_totals"] == body["scenario_totals"]

    def test_invalid_override_body_returns_422(self, client):
        resp = client.post("/api/scenario", json={"scenario": {"renewable_pct": "not-a-number"}})
        assert resp.status_code == 422

    def test_missing_scenario_key_returns_422(self, client):
        resp = client.post("/api/scenario", json={})
        assert resp.status_code == 422

    def test_scenario_reduces_co2_relative_to_baseline(self, client):
        resp = client.post(
            "/api/scenario", json={"scenario": {"carbon_intensity_gco2_per_kwh": 10}}
        )

        assert resp.status_code == 200
        body = resp.json()
        assert (
            body["scenario_totals"]["annual_co2_tonnes"]
            < body["baseline_totals"]["annual_co2_tonnes"]
        )

    def test_pue_override_applied(self, client):
        resp = client.post("/api/scenario", json={"scenario": {"pue": 1.1}})

        assert resp.status_code == 200
        body = resp.json()
        assert body["scenario_totals"]["annual_kwh"] < body["baseline_totals"]["annual_kwh"]


# --- CORS origin parsing ---
# main.py reads ALLOWED_ORIGINS at import time, so this is tested by
# re-importing the module with the env var patched rather than via the
# already-imported `main.app`.

class TestAllowedOriginsParsing:
    def test_defaults_to_localhost_when_env_unset(self, monkeypatch):
        monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        import importlib
        import main

        importlib.reload(main)

        assert main.allow_origins == ["http://localhost:5173", "http://localhost:3000"]

    def test_reads_comma_separated_env_var(self, monkeypatch):
        monkeypatch.setenv(
            "ALLOWED_ORIGINS", "https://example.com, https://foo.example.com"
        )
        import importlib
        import main

        importlib.reload(main)

        assert main.allow_origins == [
            "https://example.com",
            "https://foo.example.com",
        ]

        # Reset back to default for any subsequent tests in this process.
        monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        importlib.reload(main)
