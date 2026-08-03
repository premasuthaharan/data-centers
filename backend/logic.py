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

# --- Policy scenario constants ---
# See SOURCES.md ("Cost allocation reform markup", "Tax incentive rollback
# rates", "Hyperscale moratorium threshold") for how these were derived.
COST_ALLOCATION_THRESHOLD_MW = 100
COST_ALLOCATION_MARKUP_PCT = 15

# Per-country estimate of how much a facility's effective electricity cost is
# currently reduced by state/local tax abatements (sales/property tax
# exemptions on data center equipment). Internal heuristic, not sourced
# per-facility — see SOURCES.md.
TAX_INCENTIVE_RATES = {
    "United States": 0.12,
    "Ireland": 0.10,
    "Singapore": 0.08,
    "China": 0.10,
    "Malaysia": 0.10,
    "United Arab Emirates": 0.15,
}
DEFAULT_TAX_INCENTIVE_PCT = 0.08

HYPERSCALE_MORATORIUM_DEFAULT_MW = 50


def compute_impact(
    dc: dict,
    overrides: dict | None = None,
    pue: float = PUE,
    utilization: float = UTILIZATION_FACTOR,
) -> dict:
    overrides = overrides or {}
    power_mw = dc.get("power_mw") or 0

    # --- Hyperscale moratorium: facility excluded from scenario impact ---
    moratorium_mw = overrides.get("hyperscale_moratorium_mw")
    if (
        moratorium_mw is not None
        and power_mw >= moratorium_mw
        and dc.get("data_status") in ("announced", "planned", "under_construction")
    ):
        power_mw = 0
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
    # Thresholds tuned against the real price_lift_pct distribution for
    # power_mw > 0 facilities (4.0-8.2%, not the formula's theoretical 0-15%
    # range); see SOURCES.md ("Grid price lift severity thresholds").
    # Facilities with no power_mw ("announced") always compute to 0%, which
    # isn't a meaningful "low" signal, so they get no severity at all.
    if not power_mw:
        price_lift_severity = None
    elif elec_price_lift_pct < 5:
        price_lift_severity = "low"
    elif elec_price_lift_pct < 6:
        price_lift_severity = "moderate"
    elif elec_price_lift_pct < 7:
        price_lift_severity = "high"
    else:
        price_lift_severity = "critical"

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
    # Inverted scale: higher renewable_pct is better, so it maps to lower
    # severity. Thresholds tuned against the real renewable_pct distribution
    # (dominant ~22% default cluster, 8-61% tail); see SOURCES.md ("Grid
    # renewables severity thresholds").
    if renewable_pct < 15:
        renewable_severity = "critical"
    elif renewable_pct < 20:
        renewable_severity = "high"
    elif renewable_pct < 30:
        renewable_severity = "moderate"
    else:
        renewable_severity = "low"

    # --- Land use / heat island ---
    # Rough floor area estimate (internal heuristic); see SOURCES.md ("IT density")
    footprint_m2 = round(power_mw * 100) if power_mw else 0
    # Waste heat (MW thermal) = IT load * (PUE - 1); PUE is an internal
    # heuristic, more optimistic than industry-average PUE — see SOURCES.md.
    # Shares the PUE constant above with annual_kwh so the two stay consistent.
    waste_heat_mw = round(power_mw * (pue - 1), 1) if power_mw else 0

    # --- Effective electricity price: cost allocation + tax incentive rollback ---
    effective_price = (
        overrides.get("electricity_price_usd_per_kwh")
        or dc.get("electricity_price_usd_per_kwh")
        or 0.06
    )
    # Cost allocation reform: large facilities (>= COST_ALLOCATION_THRESHOLD_MW)
    # pay a markup reflecting their own grid-interconnection costs instead of
    # having them socialized across residential ratepayers; see SOURCES.md
    # ("Cost allocation reform markup").
    if overrides.get("cost_allocation_reform") and power_mw >= COST_ALLOCATION_THRESHOLD_MW:
        effective_price *= 1 + COST_ALLOCATION_MARKUP_PCT / 100
    # Tax incentive rollback: removes the per-country estimated tax-abatement
    # discount from the effective price; see SOURCES.md ("Tax incentive
    # rollback rates").
    if overrides.get("tax_incentive_rollback"):
        incentive_pct = TAX_INCENTIVE_RATES.get(dc.get("country"), DEFAULT_TAX_INCENTIVE_PCT)
        effective_price *= 1 + incentive_pct

    return {
        # Map geometry
        "radius_km": impact_radius_km(power_mw),
        "data_status": dc.get("data_status", "confirmed" if power_mw else "announced"),
        # Electricity
        "electricity": {
            "annual_kwh": round(annual_kwh),
            "price_lift_pct": elec_price_lift_pct,
            "price_lift_severity": price_lift_severity,
            # 10,500 kWh/home/year: EIA average US household consumption; see SOURCES.md
            "homes_powered": round(annual_kwh / 10_500),
            # Per-country electricity price, falling back to the global
            # default for records that predate per-country rates, then
            # adjusted for cost-allocation/tax-incentive scenario overrides;
            # see SOURCES.md ("Electricity price")
            "annual_cost_millions_usd": round((annual_kwh * effective_price) / 1_000_000, 1),
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
            "renewable_severity": renewable_severity,
            "intensity_gco2_per_kwh": carbon,
        },
        # Land / heat
        "land": {
            "footprint_m2": footprint_m2,
            "waste_heat_mw": waste_heat_mw,
        },
    }


# Country land area in km^2 (UN Statistics Division / World Bank "Surface
# area" series, land area excluding inland water bodies), used to normalize
# region totals to an intensity-per-area figure. Covers the same country set
# as GRID_DATA/IMPACT_RATES in fetch_data.py; see SOURCES.md ("Country land
# area").
COUNTRY_AREA_KM2 = {
    "United States": 9_147_420,
    "Canada": 9_093_507,
    "United Kingdom": 241_930,
    "Ireland": 68_883,
    "Germany": 348_560,
    "Netherlands": 33_670,
    "Belgium": 30_280,
    "France": 547_557,
    "Sweden": 410_340,
    "Norway": 365_268,
    "Finland": 303_890,
    "Denmark": 42_430,
    "Singapore": 700,
    "Japan": 364_555,
    "South Korea": 97_230,
    "Taiwan": 35_980,
    "China": 9_388_211,
    "India": 2_973_190,
    "Indonesia": 1_811_570,
    "Malaysia": 328_550,
    "Australia": 7_682_300,
    "New Zealand": 263_310,
    "Brazil": 8_358_140,
    "South Africa": 1_213_090,
    "Bahrain": 760,
    "United Arab Emirates": 71_020,
    "Israel": 21_640,
    "Switzerland": 39_516,
    "Austria": 82_409,
    "Spain": 498_800,
    "Italy": 294_140,
    "Poland": 306_170,
    "Portugal": 91_590,
}


def region_area_km2(region: str) -> float | None:
    return COUNTRY_AREA_KM2.get(region)


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


def regions_with_aggregate_impact() -> list[dict]:
    centers = all_datacenters_with_impact()
    by_region: dict[str, list[dict]] = {}
    for dc in centers:
        region = dc.get("country") or "Unknown"
        by_region.setdefault(region, []).append(dc)

    return [
        {"region": region, "area_km2": region_area_km2(region), **aggregate_impact(facilities)}
        for region, facilities in by_region.items()
    ]


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
