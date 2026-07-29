import math
import json
from pathlib import Path

_DATA_PATH = Path(__file__).parent / "data" / "datacenters.json"
_datacenters: list[dict] | None = None
_generated_at: str | None = None


def load_datacenters() -> list[dict]:
    global _datacenters, _generated_at
    if _datacenters is None:
        with open(_DATA_PATH) as f:
            raw = json.load(f)
        _generated_at = raw["generated_at"]
        _datacenters = raw["data_centers"]
    return _datacenters


def get_dataset_metadata() -> dict:
    load_datacenters()
    return {"generated_at": _generated_at}


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


# Impact radius in km: sqrt(MW) * 5 so 100MW→50km, 1000MW→158km, capped at 300km
def impact_radius_km(power_mw: float | None) -> float:
    if not power_mw:
        return 20.0
    return round(min(math.sqrt(power_mw) * 5, 300), 1)


def compute_impact(dc: dict) -> dict:
    power_mw = dc.get("power_mw") or 0
    carbon = dc.get("carbon_intensity_gco2_per_kwh") or 450
    renewable_pct = dc.get("renewable_pct") or 25

    annual_kwh = power_mw * 1_000 * 8_760  # MW → kWh/yr

    # --- Electricity price pressure ---
    # Large DCs can consume 1-5% of a regional grid; we model a price lift
    # using a logarithmic scale anchored at: 100MW = +2%, 1000MW = +8%
    elec_price_lift_pct = round(min(math.log1p(power_mw) * 1.2, 15), 1) if power_mw else 0

    # --- Water stress (million gallons/day) ---
    # Typical cooling: 1.8L per kWh for air-cooled, up to 7L for evaporative towers.
    # We use a blended 3L/kWh estimate → convert to MGD
    water_liters_per_kwh = 3.0
    water_mgd = round((annual_kwh * water_liters_per_kwh) / (3_785_411 * 365), 2)
    # Severity label anchored to US EPA baseline thresholds
    if water_mgd < 1:
        water_severity = "low"
    elif water_mgd < 5:
        water_severity = "moderate"
    elif water_mgd < 15:
        water_severity = "high"
    else:
        water_severity = "critical"

    # --- Carbon / air quality ---
    annual_co2_tonnes = round((annual_kwh * carbon) / 1_000_000)
    cars_equivalent = round(annual_co2_tonnes / 4.6)

    # --- Land use / heat island ---
    # Rough floor area: 10 kW/m² IT density → MW * 100 m² per MW
    footprint_m2 = round(power_mw * 100) if power_mw else 0
    # Waste heat (MW thermal) = IT load * (PUE - 1), approximate PUE 1.3
    waste_heat_mw = round(power_mw * 0.3, 1) if power_mw else 0

    return {
        # Map geometry
        "radius_km": impact_radius_km(power_mw),
        # Electricity
        "electricity": {
            "annual_kwh": round(annual_kwh),
            "price_lift_pct": elec_price_lift_pct,
            "homes_powered": round(annual_kwh / 10_500),
            "annual_cost_millions_usd": round((annual_kwh * 0.06) / 1_000_000, 1),
        },
        # Water
        "water": {
            "daily_withdrawal_mgd": water_mgd,
            "severity": water_severity,
        },
        # Carbon / air
        "carbon": {
            "annual_co2_tonnes": annual_co2_tonnes,
            "cars_equivalent": cars_equivalent,
            "renewable_pct": renewable_pct,
            "intensity_gco2_per_kwh": carbon,
        },
        # Land / heat
        "land": {
            "footprint_m2": footprint_m2,
            "waste_heat_mw": waste_heat_mw,
        },
    }


def all_datacenters_with_impact() -> list[dict]:
    centers = load_datacenters()
    return [{**dc, "impact": compute_impact(dc)} for dc in centers]


def nearest_datacenters(user_lat: float, user_lng: float, n: int = 3) -> list[dict]:
    centers = load_datacenters()
    scored = sorted(
        [{**dc, "distance_km": round(haversine_km(user_lat, user_lng, dc["lat"], dc["lng"]), 1)}
         for dc in centers],
        key=lambda x: x["distance_km"],
    )
    return [{**dc, "impact": compute_impact(dc)} for dc in scored[:n]]
