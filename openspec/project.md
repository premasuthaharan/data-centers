# Data Center Impact Mapper

A tool that visualizes data centers' estimated impact (electricity, water,
carbon, land use) on their surrounding area.

- **backend/**: FastAPI app. Serves a static dataset (`data/datacenters.json`,
  43 entries sourced from Epoch AI + Nominatim geocoding + a per-country grid
  table) and computes impact metrics in `logic.py` from `power_mw`,
  `carbon_intensity_gco2_per_kwh`, and `renewable_pct`.
- **frontend/**: React + Mapbox GL app. Renders the dataset on a map and
  shows per-facility impact cards. Does no calculation of its own.

## Known constraints
- Dataset is refreshed manually via `backend/fetch_data.py` (not scheduled).
- All impact formulas use global constants (PUE ~1.3, 3L/kWh cooling,
  $0.06/kWh, 4.6t CO2/car) with no per-country or per-facility variation.
- No automated tests currently exist.
