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


# Impact radius in km: sqrt(MW) * 5 so 100MW→50km, 1000MW→158km, capped at 300km.
# Facilities with no published power_mw ("announced" status) get a flat 20km
# placeholder — enough to show the site exists on the map without implying a
# measured footprint.
def impact_radius_km(power_mw: float | None) -> float:
    if not power_mw:
        return 20.0
    return round(min(math.sqrt(power_mw) * 5, 300), 1)


def compute_impact(dc: dict) -> dict:
    power_mw = dc.get("power_mw") or 0
    # 450 gCO2/kWh default: conservative internal heuristic, higher than the
    # actual US grid average; see SOURCES.md ("Default carbon intensity")
    carbon = dc.get("carbon_intensity_gco2_per_kwh") or 450
    # 25% default: approximates the actual 2024 US renewable generation
    # share; see SOURCES.md ("Default renewable percentage")
    renewable_pct = dc.get("renewable_pct") or 25

    annual_kwh = power_mw * 1_000 * 8_760  # MW → kWh/yr

    # --- Electricity price pressure ---
    # Large DCs can consume 1-5% of a regional grid; we model a price lift
    # using a logarithmic scale anchored at: 100MW = +2%, 1000MW = +8%
    elec_price_lift_pct = round(min(math.log1p(power_mw) * 1.2, 15), 1) if power_mw else 0

    # --- Water stress (million gallons/day) ---
    # Blended water intensity estimate; see SOURCES.md ("Water intensity")
    water_liters_per_kwh = 3.0
    water_mgd = round((annual_kwh * water_liters_per_kwh) / (3_785_411 * 365), 2)
    # Severity thresholds are an internal heuristic, not an EPA standard;
    # see SOURCES.md ("Water severity thresholds")
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
    # 4.6 t CO2/car/year: EPA typical passenger vehicle figure; see SOURCES.md
    cars_equivalent = round(annual_co2_tonnes / 4.6)

    # --- Land use / heat island ---
    # Rough floor area estimate (internal heuristic); see SOURCES.md ("IT density")
    footprint_m2 = round(power_mw * 100) if power_mw else 0
    # Waste heat (MW thermal) = IT load * (PUE - 1); PUE 1.3 is an internal
    # heuristic, more optimistic than industry-average PUE — see SOURCES.md
    waste_heat_mw = round(power_mw * 0.3, 1) if power_mw else 0

    return {
        # Map geometry
        "radius_km": impact_radius_km(power_mw),
        "data_status": dc.get("data_status", "confirmed" if power_mw else "announced"),
        # Electricity
        "electricity": {
            "annual_kwh": round(annual_kwh),
            "price_lift_pct": elec_price_lift_pct,
            # 10,500 kWh/home/year: EIA average US household consumption; see SOURCES.md
            "homes_powered": round(annual_kwh / 10_500),
            # $0.06/kWh: internal heuristic approximating a bulk/industrial
            # rate, well below EIA's ~$0.165/kWh residential average; see SOURCES.md
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
