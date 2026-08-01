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


# power_mw (Epoch AI's "Current power") is IT/critical load, not total
# facility draw. UTILIZATION_FACTOR and PUE convert it into actual annual
# facility energy consumption; see SOURCES.md ("Utilization factor" and
# "Power Usage Effectiveness (PUE)"). PUE is shared with waste_heat_mw below
# so the two figures stay consistent with each other.
UTILIZATION_FACTOR = 0.8
PUE = 1.3


def compute_impact(
    dc: dict,
    overrides: dict | None = None,
    pue: float = PUE,
    utilization: float = UTILIZATION_FACTOR,
) -> dict:
    overrides = overrides or {}
    power_mw = dc.get("power_mw") or 0
    # 450 gCO2/kWh default: conservative internal heuristic, higher than the
    # actual US grid average; see SOURCES.md ("Default carbon intensity")
    carbon = overrides.get("carbon_intensity_gco2_per_kwh") or dc.get("carbon_intensity_gco2_per_kwh") or 450
    # 25% default: approximates the actual 2024 US renewable generation
    # share; see SOURCES.md ("Default renewable percentage")
    renewable_pct = overrides.get("renewable_pct") or dc.get("renewable_pct") or 25

    # annual_kwh = IT load * utilization * PUE * hours/year, i.e. total
    # facility draw (IT + cooling/overhead), not just nameplate IT capacity.
    annual_kwh = power_mw * utilization * pue * 1_000 * 8_760  # MW → kWh/yr

    # --- Electricity price pressure ---
    # Large DCs can consume 1-5% of a regional grid; we model a price lift
    # using a logarithmic scale anchored at: 100MW = +2%, 1000MW = +8%
    elec_price_lift_pct = round(min(math.log1p(power_mw) * 1.2, 15), 1) if power_mw else 0

    # --- Water stress (million gallons/day) ---
    # Per-country blended water intensity, falling back to the global
    # default for records that predate per-country rates; see SOURCES.md
    # ("Water intensity")
    water_liters_per_kwh = overrides.get("water_liters_per_kwh") or dc.get("water_liters_per_kwh") or 3.0
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
    # 300 gal/household/day: EPA WaterSense average US household water use;
    # see SOURCES.md ("Households equivalent (water)")
    water_households_equivalent = round((water_mgd * 1_000_000) / 300)

    # --- Carbon / air quality ---
    annual_co2_tonnes = round((annual_kwh * carbon) / 1_000_000)
    # 4.6 t CO2/car/year: EPA typical passenger vehicle figure; see SOURCES.md
    cars_equivalent = round(annual_co2_tonnes / 4.6)

    # --- Land use / heat island ---
    # Rough floor area estimate (internal heuristic); see SOURCES.md ("IT density")
    footprint_m2 = round(power_mw * 100) if power_mw else 0
    # Waste heat (MW thermal) = IT load * (PUE - 1); PUE is an internal
    # heuristic, more optimistic than industry-average PUE — see SOURCES.md.
    # Shares the PUE constant above with annual_kwh so the two stay consistent.
    waste_heat_mw = round(power_mw * (pue - 1), 1) if power_mw else 0

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
            # Per-country electricity price, falling back to the global
            # default for records that predate per-country rates; see
            # SOURCES.md ("Electricity price")
            "annual_cost_millions_usd": round(
                (annual_kwh * (
                    overrides.get("electricity_price_usd_per_kwh")
                    or dc.get("electricity_price_usd_per_kwh")
                    or 0.06
                )) / 1_000_000, 1
            ),
        },
        # Water
        "water": {
            "daily_withdrawal_mgd": water_mgd,
            "severity": water_severity,
            "households_equivalent": water_households_equivalent,
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


def aggregate_impact(centers_with_impact: list[dict]) -> dict:
    water_severity_counts = {"low": 0, "moderate": 0, "high": 0, "critical": 0}
    for dc in centers_with_impact:
        severity = dc["impact"]["water"]["severity"]
        water_severity_counts[severity] += 1

    return {
        "facility_count": len(centers_with_impact),
        "annual_kwh": sum(dc["impact"]["electricity"]["annual_kwh"] for dc in centers_with_impact),
        "annual_co2_tonnes": sum(dc["impact"]["carbon"]["annual_co2_tonnes"] for dc in centers_with_impact),
        "daily_withdrawal_mgd": round(
            sum(dc["impact"]["water"]["daily_withdrawal_mgd"] for dc in centers_with_impact), 2
        ),
        "annual_cost_millions_usd": round(
            sum(dc["impact"]["electricity"]["annual_cost_millions_usd"] for dc in centers_with_impact), 1
        ),
        "water_severity_counts": water_severity_counts,
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
