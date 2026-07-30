import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

FIXTURE_DATACENTERS = [
    {
        "id": "confirmed-dc",
        "name": "Confirmed DC",
        "operator": "Amazon",
        "country": "United States",
        "address": "1 Main St, Springfield, IL 62701",
        "lat": 39.78,
        "lng": -89.65,
        "geocode_precision": "address",
        "power_mw": 100.0,
        "data_status": "confirmed",
        "cost_usd_billions": 2.5,
        "carbon_intensity_gco2_per_kwh": 380,
        "renewable_pct": 22,
    },
    {
        "id": "announced-dc",
        "name": "Announced DC",
        "operator": "Microsoft",
        "country": "Ireland",
        "address": "",
        "lat": 53.35,
        "lng": -6.26,
        "geocode_precision": "country",
        "power_mw": None,
        "data_status": "announced",
        "cost_usd_billions": None,
        "carbon_intensity_gco2_per_kwh": 290,
        "renewable_pct": 35,
    },
    {
        "id": "far-dc",
        "name": "Far DC",
        "operator": "Google",
        "country": "Australia",
        "address": "1 Remote Rd, Perth WA",
        "lat": -31.95,
        "lng": 115.86,
        "geocode_precision": "approximate",
        "power_mw": 50.0,
        "data_status": "confirmed",
        "cost_usd_billions": 1.0,
        "carbon_intensity_gco2_per_kwh": 590,
        "renewable_pct": 29,
    },
]


@pytest.fixture
def fixture_dataset():
    return {
        "generated_at": "2026-01-01T00:00:00+00:00",
        "data_centers": [dict(dc) for dc in FIXTURE_DATACENTERS],
    }


@pytest.fixture
def datacenters_json_file(tmp_path, fixture_dataset):
    path = tmp_path / "datacenters.json"
    path.write_text(json.dumps(fixture_dataset))
    return path


@pytest.fixture
def reset_logic_cache():
    """logic.py caches the dataset in module-level globals; clear before/after
    each test so tests don't leak state into each other."""
    import logic

    logic._datacenters = None
    logic._generated_at = None
    yield
    logic._datacenters = None
    logic._generated_at = None
