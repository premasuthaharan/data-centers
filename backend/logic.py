import math
import json
import re
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
#
# Both are per-category (keyed by the `category` field): frontier-ai
# campuses keep the optimistic, near-continuous-load values; general-purpose
# facilities (colo, enterprise, regional cloud AZs) use the Uptime
# Institute's broader survey-average PUE and a lower utilization figure.
# Records missing `category` fall back to the frontier-ai values (today's
# prior global constants), matching pre-migration behavior.
UTILIZATION_FACTOR = 0.8
PUE = 1.3

UTILIZATION_FACTOR_BY_CATEGORY = {
    "frontier-ai": 0.8,
    "general-purpose": 0.65,
}
PUE_BY_CATEGORY = {
    "frontier-ai": 1.3,
    "general-purpose": 1.56,
}

# --- Policy scenario constants ---
# See SOURCES.md ("Cost allocation reform markup", "Tax incentive rollback
# rates") for how these were derived.
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


def compute_impact(
    dc: dict,
    overrides: dict | None = None,
    pue: float | None = None,
    utilization: float | None = None,
) -> dict:
    overrides = overrides or {}
    power_mw = dc.get("power_mw") or 0
    category = dc.get("category", "frontier-ai")
    # Explicit pue/utilization args (used by the policy-scenario feature)
    # win over the category default, which wins over the missing-category
    # fallback to today's prior global constants.
    if pue is None:
        pue = PUE_BY_CATEGORY.get(category, PUE)
    if utilization is None:
        utilization = UTILIZATION_FACTOR_BY_CATEGORY.get(category, UTILIZATION_FACTOR)
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
    # power_mw > 0 facilities, re-validated against the full 318-entry
    # mixed-category dataset (2.2-11.2%, not the formula's theoretical
    # 0-15% range); see SOURCES.md ("Grid price lift severity thresholds").
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
    # re-tuned against the full 318-entry mixed-category dataset; see
    # SOURCES.md ("Water severity thresholds")
    if water_mgd < 1:
        water_severity = "low"
    elif water_mgd < 2.5:
        water_severity = "moderate"
    elif water_mgd < 5:
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


# Renewable generation share (%) by country, mirroring GRID_DATA's
# renewable_pct in fetch_data.py (kept as a separate table here since
# logic.py must not import fetch_data.py — that module is a standalone CLI
# script with network/CSV dependencies unrelated to serving the API).
# Covers the full country set fetch_data.py can geocode into, not just
# countries currently represented in datacenters.json, so grid_context's
# "N of M tracked grids" reflects the full tracked universe.
COUNTRY_RENEWABLE_PCT = {
    "United States": 22, "Canada": 67, "United Kingdom": 42, "Ireland": 35,
    "Germany": 52, "Netherlands": 40, "Belgium": 30, "France": 24,
    "Sweden": 83, "Norway": 98, "Finland": 60, "Denmark": 65,
    "Singapore": 3, "Japan": 22, "South Korea": 9, "Taiwan": 8,
    "China": 29, "India": 20, "Indonesia": 15, "Malaysia": 17,
    "Australia": 29, "New Zealand": 84, "Brazil": 88, "South Africa": 12,
    "Bahrain": 5, "United Arab Emirates": 8, "Israel": 10, "Switzerland": 62,
    "Austria": 80, "Spain": 50, "Italy": 42, "Poland": 18, "Portugal": 61,
}


def grid_context(country: str) -> dict | None:
    """Rank/percentile of a country's renewable generation share among all
    tracked countries. Returns None when the country isn't tracked."""
    pct = COUNTRY_RENEWABLE_PCT.get(country)
    if pct is None:
        return None
    ranked = sorted(COUNTRY_RENEWABLE_PCT.items(), key=lambda kv: kv[1], reverse=True)
    total = len(ranked)
    rank = next(i for i, (name, _) in enumerate(ranked, start=1) if name == country)
    greener_than = sum(1 for _, other_pct in COUNTRY_RENEWABLE_PCT.items() if other_pct < pct)
    return {
        "rank": rank,
        "total_tracked": total,
        "greener_than_pct": round(100 * greener_than / (total - 1)) if total > 1 else None,
    }


# US state names -> 2-letter code, for deriving state from a facility's
# free-text address (which carries city/state, not a structured field).
US_STATE_NAMES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY",
}
US_STATE_CODES = set(US_STATE_NAMES.values())


def extract_us_state(address: str, country: str) -> str | None:
    """Best-effort 2-letter US state code from a free-text address. Returns
    None (not a guess) when the address doesn't carry a recognizable state —
    callers must treat that as "state unknown," not "state absent"."""
    if country != "United States" or not address:
        return None
    parts = [p.strip() for p in address.split(",") if p.strip()]
    for part in reversed(parts):
        m = re.fullmatch(r"([A-Z]{2})(\s+\d{3,10})?", part)
        if m and m.group(1) in US_STATE_CODES:
            return m.group(1)
    for part in reversed(parts):
        for name, code in US_STATE_NAMES.items():
            if part == name or part.endswith(f" {name}"):
                return code
    return None


# Water stress category by US state, using WRI Aqueduct's own category
# labels ("Low", "Low-medium", "Medium-high", "High", "Extremely high") as
# informal guidance rather than a precise per-state statistic — same
# sourcing approach as IMPACT_RATES' per-country water intensity in
# fetch_data.py. See SOURCES.md ("State water stress category"). States not
# listed here are treated as unavailable, not defaulted.
STATE_WATER_STRESS = {
    "AZ": "extremely high", "NM": "extremely high", "CA": "extremely high",
    "NV": "extremely high", "TX": "high", "CO": "high", "UT": "high",
    "OK": "high", "KS": "high", "NE": "moderate", "ND": "moderate",
    "WY": "moderate", "GA": "moderate", "NC": "moderate", "SC": "moderate",
    "VA": "moderate", "TN": "moderate", "AL": "moderate", "MS": "moderate",
    "LA": "low", "IA": "low", "IN": "low", "OH": "low", "WI": "low",
    "MN": "low", "NY": "low",
}


def water_stress_category(state: str | None) -> str | None:
    if state is None:
        return None
    return STATE_WATER_STRESS.get(state)


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


def _percentile_rank(values: list[float], value: float) -> int:
    """% of values strictly less than `value` — "uses more water than X% of
    tracked facilities" reads naturally as this direction, not <=."""
    if len(values) <= 1:
        return 0
    lower = sum(1 for v in values if v < value)
    return round(100 * lower / (len(values) - 1))


def _region_key(dc: dict) -> str | None:
    country = dc.get("country")
    state = extract_us_state(dc.get("address") or "", country or "")
    if state:
        return f"US-{state}"
    return country


def _region_label(region_key: str) -> str:
    if region_key.startswith("US-"):
        return region_key[3:]
    return region_key


def compute_peer_contexts(centers_with_impact: list[dict]) -> dict[str, dict]:
    """Percentile rank (among all facilities) and rank-within-region (US
    state, else country) for water/carbon/electricity, keyed by facility id.
    Computed once across the full dataset so every facility is compared
    against the same population."""
    water = [dc["impact"]["water"]["daily_withdrawal_mgd"] for dc in centers_with_impact]
    carbon = [dc["impact"]["carbon"]["annual_co2_tonnes"] for dc in centers_with_impact]
    elec = [dc["impact"]["electricity"]["annual_kwh"] for dc in centers_with_impact]

    by_region: dict[str, list[dict]] = {}
    for dc in centers_with_impact:
        key = _region_key(dc)
        if key:
            by_region.setdefault(key, []).append(dc)

    region_water_rank: dict[str, tuple[int, int]] = {}
    for key, facilities in by_region.items():
        ordered = sorted(facilities, key=lambda d: d["impact"]["water"]["daily_withdrawal_mgd"], reverse=True)
        for i, dc in enumerate(ordered, start=1):
            region_water_rank[dc["id"]] = (i, len(ordered))

    contexts = {}
    for dc, w, c, e in zip(centers_with_impact, water, carbon, elec):
        region_key = _region_key(dc)
        entry = {
            "water_percentile": _percentile_rank(water, w),
            "carbon_percentile": _percentile_rank(carbon, c),
            "electricity_percentile": _percentile_rank(elec, e),
        }
        if region_key and dc["id"] in region_water_rank:
            rank, total = region_water_rank[dc["id"]]
            entry["region_label"] = _region_label(region_key)
            entry["water_rank_in_region"] = rank
            entry["facilities_in_region"] = total
        contexts[dc["id"]] = entry
    return contexts


def all_datacenters_with_impact() -> list[dict]:
    centers = load_datacenters()
    with_impact = [{**dc, "impact": compute_impact(dc)} for dc in centers]

    peer_contexts = compute_peer_contexts(with_impact)
    for dc in with_impact:
        dc["impact"]["peer_context"] = peer_contexts.get(dc["id"])
        state = extract_us_state(dc.get("address") or "", dc.get("country") or "")
        dc["impact"]["water"]["stress_category"] = water_stress_category(state)
        dc["impact"]["carbon"]["grid_context"] = grid_context(dc.get("country") or "")
    return with_impact


def datacenter_by_id_with_impact(facility_id: str) -> dict | None:
    centers = load_datacenters()
    dc = next((dc for dc in centers if dc["id"] == facility_id), None)
    return {**dc, "impact": compute_impact(dc)} if dc else None


def nearest_datacenters(user_lat: float, user_lng: float, n: int = 3) -> list[dict]:
    centers = load_datacenters()
    scored = sorted(
        [{**dc, "distance_km": round(haversine_km(user_lat, user_lng, dc["lat"], dc["lng"]), 1)}
         for dc in centers],
        key=lambda x: x["distance_km"],
    )
    return [{**dc, "impact": compute_impact(dc)} for dc in scored[:n]]
