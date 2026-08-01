# Backend

FastAPI app serving a static dataset of data center facilities enriched
with estimated environmental/economic impact metrics.

## Running locally

```
pip install -r requirements.txt
uvicorn main:app --reload
```

Serves on `http://localhost:8000` by default.

## Endpoints

### `GET /api/datacenters`

Returns every data center in the dataset, each enriched with computed
impact metrics.

```json
{
  "generated_at": "2026-07-30T03:30:10.468320+00:00",
  "data_centers": [
    {
      "id": "colossus-2",
      "name": "Colossus 2",
      "operator": "SpaceXAI",
      "country": "United States",
      "address": "5420 Tulane Rd, Memphis, TN 38109",
      "lat": 34.9979829,
      "lng": -90.0348674,
      "geocode_precision": "address",
      "power_mw": 946.0,
      "data_status": "confirmed",
      "cost_usd_billions": 35.836372,
      "carbon_intensity_gco2_per_kwh": 380,
      "renewable_pct": 22,
      "electricity_price_usd_per_kwh": 0.083,
      "water_liters_per_kwh": 2.3,
      "impact": {
        "radius_km": 153.8,
        "data_status": "confirmed",
        "electricity": { "annual_kwh": 8618438400, "price_lift_pct": 8.2, "homes_powered": 820804, "annual_cost_millions_usd": 715.3 },
        "water": { "daily_withdrawal_mgd": 14.35, "severity": "high" },
        "carbon": { "annual_co2_tonnes": 3275007, "cars_equivalent": 711958, "renewable_pct": 22, "intensity_gco2_per_kwh": 380 },
        "land": { "footprint_m2": 94600, "waste_heat_mw": 283.8 }
      }
    }
  ]
}
```

### `GET /api/locate?ip={ip}`

Resolves an IP address to an approximate location via
[ip-api.com](http://ip-api.com), used to center the map on the visitor's
region on first load.

```json
{ "lat": 37.7749, "lng": -122.4194, "city": "San Francisco", "country": "United States" }
```

Returns `502` if the upstream lookup fails.

### `GET /api/datacenters/nearest?lat={lat}&lng={lng}&n={n}`

Returns the `n` (default 3, max 20) data centers closest to the given
coordinates, sorted ascending by distance, each with a `distance_km`
field and the same `impact` object as `/api/datacenters`.

```json
[
  {
    "id": "colossus-2",
    "...": "same shape as /api/datacenters entries",
    "distance_km": 4.2,
    "impact": { "...": "..." }
  }
]
```

## Data sources & methodology

The dataset (`data/datacenters.json`) is generated offline by
`fetch_data.py`, not fetched live:

1. **Facility data** comes from the
   [Epoch AI data centers dataset](https://epoch.ai/data/data_centers/data_centers.csv)
   (name, operator, country, address, power capacity, capital cost).
2. **Geocoding** resolves each address to coordinates via
   [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap),
   falling back progressively from a full address match, to a
   simplified city/region match, to a bare country-level match —
   `geocode_precision` on each record reflects which tier succeeded.
3. **Grid carbon intensity, renewable %, electricity price, and water
   intensity** come from static per-country lookup tables in
   `fetch_data.py` (`GRID_DATA`, `IMPACT_RATES`), with documented
   defaults for countries not in the table.
4. **Impact metrics** (`logic.py`, `compute_impact()`) are derived from
   those fields: electricity draw applies a utilization factor and PUE
   to nameplate power, then flows into cost/homes-powered/carbon/water
   estimates. Every constant used is documented with its status (real
   external source vs. internal heuristic) in [`SOURCES.md`](SOURCES.md)
   — read that before treating any of these numbers as measured fact.

The dataset is not fetched at request time — see "Refreshing the
dataset" below for how and when it updates.

## Configuration

`ALLOWED_ORIGINS` — comma-separated list of origins allowed by CORS
(e.g. `https://example.com,https://www.example.com`). Defaults to
`http://localhost:5173,http://localhost:3000` if unset.

## Refreshing the dataset

`data/datacenters.json` is generated from the Epoch AI data centers CSV
and is not fetched at runtime — refresh it with:

```
make refresh-data
```

(run from the repo root; wraps `python3 fetch_data.py`). This re-fetches
the source CSV, re-geocodes every entry via Nominatim, and overwrites
`data/datacenters.json`. It takes a while (Nominatim is rate-limited to
~1 request/second) and requires network access. A GitHub Actions workflow
(`.github/workflows/refresh-data.yml`) also runs this monthly and opens a
PR with the resulting diff for review — see that workflow for the
automated schedule.

## Testing & coverage

```
pip install -r requirements-dev.txt
pytest
```

Coverage is measured automatically (configured in `pytest.ini` /
`.coveragerc`) and printed after the test results; the run fails if
coverage drops below the threshold in `pytest.ini`
(`--cov-fail-under`). `.github/workflows/ci.yml` runs this on every PR.
