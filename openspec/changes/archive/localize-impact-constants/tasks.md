## 1. Data table
- [x] 1.1 Extend `GRID_DATA` (or add a parallel table) in `fetch_data.py`
      with `electricity_price_usd_per_kwh` and `water_liters_per_kwh` per
      country
- [x] 1.2 Source reasonable per-country starting values (e.g. IEA
      electricity price data, WRI Aqueduct water stress as a proxy for
      cooling-water cost/availability) — see also
      [[cite-impact-formula-sources]] for proper citation
- [x] 1.3 Keep an explicit documented default for countries not in the
      table (do not silently reuse the current global constants without
      labeling them as defaults)

## 2. Backend
- [x] 2.1 Add `electricity_price_usd_per_kwh` and `water_liters_per_kwh`
      fields to each record when generating `datacenters.json`
- [x] 2.2 Update `compute_impact()` in `logic.py` to read these fields off
      `dc` instead of the hardcoded `0.06` and `3.0` literals, falling back
      to the current global constants only if a record predates this change

## 3. Regeneration
- [x] 3.1 Regenerate `datacenters.json` with the new fields populated for
      all 75 entries (backfilled by country from `IMPACT_RATES` rather than
      re-running full geocoding, since lat/lng/precision are unaffected)

## 4. Verification
- [x] 4.1 Spot check that facilities in different countries now produce
      different water/cost estimates for the same `power_mw`
- [x] 4.2 Confirm the fallback default still applies correctly for any
      country missing from the table
