"""
Run once to download and process the Epoch AI data centers CSV into data/datacenters.json.
Geocodes addresses via Nominatim (OpenStreetMap) — free, no key needed.
Usage: python3 fetch_data.py
"""

import csv
import hashlib
import json
import math
import time
import io
import urllib.request
import urllib.parse
from datetime import datetime, timezone

EPOCH_CSV_URL = "https://epoch.ai/data/data_centers/data_centers.csv"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Static carbon intensity (gCO2/kWh) and renewable % by country name or ISO2
GRID_DATA = {
    "United States": {"carbon_intensity": 380, "renewable_pct": 22},
    "Canada":        {"carbon_intensity": 130, "renewable_pct": 67},
    "United Kingdom":{"carbon_intensity": 210, "renewable_pct": 42},
    "Ireland":       {"carbon_intensity": 290, "renewable_pct": 35},
    "Germany":       {"carbon_intensity": 380, "renewable_pct": 52},
    "Netherlands":   {"carbon_intensity": 290, "renewable_pct": 40},
    "Belgium":       {"carbon_intensity": 160, "renewable_pct": 30},
    "France":        {"carbon_intensity": 55,  "renewable_pct": 24},
    "Sweden":        {"carbon_intensity": 13,  "renewable_pct": 83},
    "Norway":        {"carbon_intensity": 22,  "renewable_pct": 98},
    "Finland":       {"carbon_intensity": 90,  "renewable_pct": 60},
    "Denmark":       {"carbon_intensity": 170, "renewable_pct": 65},
    "Singapore":     {"carbon_intensity": 510, "renewable_pct": 3},
    "Japan":         {"carbon_intensity": 480, "renewable_pct": 22},
    "South Korea":   {"carbon_intensity": 460, "renewable_pct": 9},
    "Taiwan":        {"carbon_intensity": 560, "renewable_pct": 8},
    "China":         {"carbon_intensity": 530, "renewable_pct": 29},
    "India":         {"carbon_intensity": 700, "renewable_pct": 20},
    "Indonesia":     {"carbon_intensity": 720, "renewable_pct": 15},
    "Malaysia":      {"carbon_intensity": 580, "renewable_pct": 17},
    "Australia":     {"carbon_intensity": 590, "renewable_pct": 29},
    "New Zealand":   {"carbon_intensity": 130, "renewable_pct": 84},
    "Brazil":        {"carbon_intensity": 170, "renewable_pct": 88},
    "South Africa":  {"carbon_intensity": 780, "renewable_pct": 12},
    "Bahrain":       {"carbon_intensity": 640, "renewable_pct": 5},
    "United Arab Emirates": {"carbon_intensity": 580, "renewable_pct": 8},
    "Israel":        {"carbon_intensity": 420, "renewable_pct": 10},
    "Switzerland":   {"carbon_intensity": 40,  "renewable_pct": 62},
    "Austria":       {"carbon_intensity": 130, "renewable_pct": 80},
    "Spain":         {"carbon_intensity": 200, "renewable_pct": 50},
    "Italy":         {"carbon_intensity": 330, "renewable_pct": 42},
    "Poland":        {"carbon_intensity": 700, "renewable_pct": 18},
    "Portugal":      {"carbon_intensity": 160, "renewable_pct": 61},
}
DEFAULT_GRID = {"carbon_intensity": 450, "renewable_pct": 25}

# Static per-country electricity price (industrial/bulk USD per kWh) and water
# intensity (blended L/kWh, proxying cooling technology + climate aridity) —
# see SOURCES.md ("Per-country electricity price" and "Per-country water
# intensity") for how these were derived and their limitations.
IMPACT_RATES = {
    "United States":        {"electricity_price_usd_per_kwh": 0.083, "water_liters_per_kwh": 2.3},
    "Canada":                {"electricity_price_usd_per_kwh": 0.070, "water_liters_per_kwh": 1.8},
    "United Kingdom":        {"electricity_price_usd_per_kwh": 0.171, "water_liters_per_kwh": 1.5},
    "Ireland":               {"electricity_price_usd_per_kwh": 0.145, "water_liters_per_kwh": 1.5},
    "Germany":               {"electricity_price_usd_per_kwh": 0.198, "water_liters_per_kwh": 1.8},
    "Netherlands":           {"electricity_price_usd_per_kwh": 0.145, "water_liters_per_kwh": 1.8},
    "Belgium":               {"electricity_price_usd_per_kwh": 0.150, "water_liters_per_kwh": 1.8},
    "France":                {"electricity_price_usd_per_kwh": 0.110, "water_liters_per_kwh": 1.8},
    "Sweden":                {"electricity_price_usd_per_kwh": 0.090, "water_liters_per_kwh": 1.3},
    "Norway":                {"electricity_price_usd_per_kwh": 0.060, "water_liters_per_kwh": 1.3},
    "Finland":               {"electricity_price_usd_per_kwh": 0.080, "water_liters_per_kwh": 1.3},
    "Denmark":               {"electricity_price_usd_per_kwh": 0.130, "water_liters_per_kwh": 1.5},
    "Singapore":             {"electricity_price_usd_per_kwh": 0.140, "water_liters_per_kwh": 3.5},
    "Japan":                 {"electricity_price_usd_per_kwh": 0.155, "water_liters_per_kwh": 2.0},
    "South Korea":           {"electricity_price_usd_per_kwh": 0.100, "water_liters_per_kwh": 2.0},
    "Taiwan":                {"electricity_price_usd_per_kwh": 0.080, "water_liters_per_kwh": 2.5},
    "China":                 {"electricity_price_usd_per_kwh": 0.080, "water_liters_per_kwh": 2.5},
    "India":                 {"electricity_price_usd_per_kwh": 0.090, "water_liters_per_kwh": 3.5},
    "Indonesia":             {"electricity_price_usd_per_kwh": 0.070, "water_liters_per_kwh": 3.0},
    "Malaysia":              {"electricity_price_usd_per_kwh": 0.055, "water_liters_per_kwh": 3.0},
    "Australia":             {"electricity_price_usd_per_kwh": 0.145, "water_liters_per_kwh": 4.5},
    "New Zealand":           {"electricity_price_usd_per_kwh": 0.130, "water_liters_per_kwh": 1.8},
    "Brazil":                {"electricity_price_usd_per_kwh": 0.100, "water_liters_per_kwh": 2.3},
    "South Africa":          {"electricity_price_usd_per_kwh": 0.080, "water_liters_per_kwh": 4.5},
    "Bahrain":               {"electricity_price_usd_per_kwh": 0.030, "water_liters_per_kwh": 8.0},
    "United Arab Emirates":  {"electricity_price_usd_per_kwh": 0.045, "water_liters_per_kwh": 8.0},
    "Israel":                {"electricity_price_usd_per_kwh": 0.150, "water_liters_per_kwh": 6.0},
    "Switzerland":           {"electricity_price_usd_per_kwh": 0.220, "water_liters_per_kwh": 1.3},
    "Austria":               {"electricity_price_usd_per_kwh": 0.180, "water_liters_per_kwh": 1.5},
    "Spain":                 {"electricity_price_usd_per_kwh": 0.150, "water_liters_per_kwh": 4.5},
    "Italy":                 {"electricity_price_usd_per_kwh": 0.250, "water_liters_per_kwh": 1.8},
    "Poland":                {"electricity_price_usd_per_kwh": 0.140, "water_liters_per_kwh": 1.8},
    "Portugal":              {"electricity_price_usd_per_kwh": 0.190, "water_liters_per_kwh": 3.0},
}
# Explicit, labeled defaults for any country not in IMPACT_RATES above — these
# intentionally match the previous global constants in logic.py so existing
# behavior is preserved for countries we don't have specific data for yet.
DEFAULT_IMPACT_RATES = {"electricity_price_usd_per_kwh": 0.06, "water_liters_per_kwh": 3.0}


def fetch_csv(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "datacenter-mapper/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def _nominatim_query(query: str) -> tuple[float, float] | None:
    params = urllib.parse.urlencode({"q": query, "format": "json", "limit": 1})
    url = f"{NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "datacenter-mapper/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read())
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        print(f"  Geocode error for '{query}': {e}")
    return None


def _simplify_address(address: str) -> str:
    """Reduce a verbose address to 'City, State' or 'City' for better geocoding."""
    import re
    parts = [p.strip() for p in address.split(",") if p.strip()]
    # Find the "STATE ZIP" or "STATE" part (e.g. "AL 36105" or "WY") and take the
    # part immediately before it as the city — this is robust to street prefixes
    # like "Co Rd 42" that don't start with a house number, unlike a regex over
    # the whole string. A naive "last 2 comma parts" fallback risks landing on
    # "STATE ZIP, USA" alone (city dropped), which Nominatim can fuzzy-match to
    # an unrelated place via the bare zip digits.
    for i, part in enumerate(parts):
        if re.fullmatch(r'[A-Z]{2}(\s*\d{3,10})?', part) and i > 0:
            return f"{parts[i - 1]}, {part.split()[0]}"
    if len(parts) >= 2:
        return ", ".join(parts[-2:])
    return address


def _jitter_country_centroid(lat: float, lng: float, facility_id: str, radius_km: float = 40) -> tuple[float, float]:
    """Country-tier geocodes all land on the same country centroid, which stacks
    unrelated facilities on top of each other on the map (only the top one in
    z-order is even clickable). Spread them deterministically around the
    centroid so each stays visible/clickable — this does not add precision,
    it just stops them from occluding one another. geocode_precision stays
    'country' since the actual location confidence hasn't changed."""
    digest = hashlib.sha256(facility_id.encode()).hexdigest()
    angle = (int(digest[:8], 16) / 0xFFFFFFFF) * 2 * math.pi
    frac = (int(digest[8:16], 16) / 0xFFFFFFFF) ** 0.5  # sqrt for uniform disk density
    dist_km = frac * radius_km
    dist_lat = dist_km / 111.32
    dist_lng = dist_km / (111.32 * math.cos(math.radians(lat)) or 1e-9)
    return lat + dist_lat * math.sin(angle), lng + dist_lng * math.cos(angle)


def geocode(address: str, country: str) -> tuple[float, float, str] | None:
    """Try progressively coarser queries. Returns (lat, lng, precision):
    'address' for a full verbatim-address match, 'approximate' for a
    simplified (city/region-level) address match, 'country' for a bare
    country-name match, or None if every tier failed. Each tier is a
    materially different confidence level and must not be conflated —
    a simplified-address match can still be thousands of km off."""
    attempts = []
    if address:
        attempts.append((f"{address}, {country}", "address"))
        attempts.append((f"{_simplify_address(address)}, {country}", "approximate"))
    attempts.append((country, "country"))

    for query, precision in attempts:
        result = _nominatim_query(query)
        time.sleep(1.1)
        if result:
            lat, lng = result
            return lat, lng, precision
    return None


def parse_float(val, default=None):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def clean_owner(raw: str) -> str:
    if not raw:
        return "Unknown"
    # Strip confidence tags like "#confident", "#likely"
    parts = [p.split("#")[0].strip() for p in raw.split(",")]
    return ", ".join(p for p in parts if p)


def main():
    print("Fetching Epoch AI data centers CSV...")
    raw = fetch_csv(EPOCH_CSV_URL)
    reader = csv.DictReader(io.StringIO(raw))
    rows = list(reader)
    print(f"Found {len(rows)} entries")

    results = []
    for i, row in enumerate(rows):
        name = (row.get("Name") or "").strip()
        owner = clean_owner(row.get("Owner") or "")
        country = (row.get("Country") or "").strip()
        address = (row.get("Address") or "").strip()
        power_mw = parse_float(row.get("Current power (MW)"))
        cost_bn = parse_float(row.get("Current total capital cost (2025 USD billions)"))

        if not name:
            continue

        print(f"[{i+1}/{len(rows)}] Geocoding: {name} ({address or country})")
        result = geocode(address, country)

        if not result:
            print(f"  FAILED: could not geocode at any precision tier")
            lat, lng, geocode_precision = None, None, "failed"
        else:
            lat, lng, geocode_precision = result
            if geocode_precision != "address":
                print(f"  WARN: only resolved to '{geocode_precision}' precision ({lat}, {lng})")

        grid = GRID_DATA.get(country, DEFAULT_GRID)
        rates = IMPACT_RATES.get(country, DEFAULT_IMPACT_RATES)

        dc_id = "".join(
            c if c.isalnum() or c == "-" else "-"
            for c in name.lower().replace(" ", "-")
        )[:60]

        if geocode_precision == "country" and lat is not None:
            lat, lng = _jitter_country_centroid(lat, lng, dc_id)

        results.append({
            "id": dc_id,
            "name": name,
            "operator": owner,
            "country": country,
            "address": address,
            "lat": lat,
            "lng": lng,
            "geocode_precision": geocode_precision,
            "power_mw": power_mw,
            "data_status": "confirmed" if power_mw else "announced",
            "cost_usd_billions": cost_bn,
            "carbon_intensity_gco2_per_kwh": grid["carbon_intensity"],
            "renewable_pct": grid["renewable_pct"],
            "electricity_price_usd_per_kwh": rates["electricity_price_usd_per_kwh"],
            "water_liters_per_kwh": rates["water_liters_per_kwh"],
        })

    out_path = "data/datacenters.json"
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_centers": results,
    }
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    n_approx = sum(1 for r in results if r["geocode_precision"] == "approximate")
    n_country = sum(1 for r in results if r["geocode_precision"] == "country")
    n_failed = sum(1 for r in results if r["geocode_precision"] == "failed")
    print(f"\nDone. Saved {len(results)} data centers to {out_path}")
    print(f"  {n_approx} resolved at simplified-address ('approximate') precision only")
    print(f"  {n_country} resolved at country-level precision only")
    print(f"  {n_failed} failed to geocode (lat/lng set to null)")


if __name__ == "__main__":
    main()
