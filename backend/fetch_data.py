"""
Run once to download and process the Epoch AI data centers CSV into data/datacenters.json.
Geocodes addresses via Nominatim (OpenStreetMap) — free, no key needed.
Usage: python3 fetch_data.py
"""

import csv
import json
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
    "Australia":     {"carbon_intensity": 590, "renewable_pct": 29},
    "New Zealand":   {"carbon_intensity": 130, "renewable_pct": 84},
    "Brazil":        {"carbon_intensity": 170, "renewable_pct": 88},
    "South Africa":  {"carbon_intensity": 780, "renewable_pct": 12},
    "Bahrain":       {"carbon_intensity": 640, "renewable_pct": 5},
    "UAE":           {"carbon_intensity": 580, "renewable_pct": 8},
    "Israel":        {"carbon_intensity": 420, "renewable_pct": 10},
    "Switzerland":   {"carbon_intensity": 40,  "renewable_pct": 62},
    "Austria":       {"carbon_intensity": 130, "renewable_pct": 80},
    "Spain":         {"carbon_intensity": 200, "renewable_pct": 50},
    "Italy":         {"carbon_intensity": 330, "renewable_pct": 42},
    "Poland":        {"carbon_intensity": 700, "renewable_pct": 18},
}
DEFAULT_GRID = {"carbon_intensity": 450, "renewable_pct": 25}


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
    # Strip company names (anything before the last comma-separated real address part)
    # Try to extract: number street, city, state zip pattern
    m = re.search(r'\d+\s[\w\s]+,\s*([\w\s]+),\s*([A-Z]{2})\s*\d*', address)
    if m:
        return f"{m.group(1).strip()}, {m.group(2).strip()}"
    # Fallback: take the last 2 comma-separated parts
    parts = [p.strip() for p in address.split(",") if p.strip()]
    if len(parts) >= 2:
        return ", ".join(parts[-2:])
    return address


def geocode(address: str, country: str) -> tuple[float, float] | None:
    attempts = []
    if address:
        attempts.append(f"{address}, {country}")
        attempts.append(f"{_simplify_address(address)}, {country}")
    attempts.append(country)

    for query in attempts:
        result = _nominatim_query(query)
        time.sleep(1.1)
        if result:
            return result
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
        coords = geocode(address, country)

        if not coords:
            print(f"  SKIP: could not geocode")
            continue

        lat, lng = coords
        grid = GRID_DATA.get(country, DEFAULT_GRID)

        dc_id = "".join(
            c if c.isalnum() or c == "-" else "-"
            for c in name.lower().replace(" ", "-")
        )[:60]

        results.append({
            "id": dc_id,
            "name": name,
            "operator": owner,
            "country": country,
            "address": address,
            "lat": lat,
            "lng": lng,
            "power_mw": power_mw,
            "data_status": "confirmed" if power_mw else "announced",
            "cost_usd_billions": cost_bn,
            "carbon_intensity_gco2_per_kwh": grid["carbon_intensity"],
            "renewable_pct": grid["renewable_pct"],
        })

    out_path = "data/datacenters.json"
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_centers": results,
    }
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nDone. Saved {len(results)} data centers to {out_path}")


if __name__ == "__main__":
    main()
