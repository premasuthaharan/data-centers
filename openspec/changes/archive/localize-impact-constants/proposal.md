## Why

Every impact formula in `logic.py` uses one global constant regardless of
country or climate, even though `country` is already present on every
record and `fetch_data.py` already maintains a per-country lookup pattern
(`GRID_DATA`) for carbon intensity:

- Water: flat 3.0 L/kWh for every facility, regardless of cooling technology
  or climate (arid vs. temperate).
- Electricity cost: flat $0.06/kWh globally, ignoring real per-country
  electricity price variation.

This makes cross-country comparisons misleading — e.g. a facility in a
water-stressed region and one in a temperate region get identical water
estimates.

## What Changes

- Extend the existing per-country table pattern in `fetch_data.py`
  (currently only `GRID_DATA` for carbon/renewables) to also include
  `electricity_price_usd_per_kwh` and `water_liters_per_kwh` per country,
  with clearly-labeled defaults for countries not in the table.
- Update `compute_impact()` in `logic.py` to read these per-country values
  from the data record instead of using the hardcoded `0.06` and `3.0`
  constants.

## Impact

- Affected code: `backend/fetch_data.py` (`GRID_DATA` table),
  `backend/data/datacenters.json` (two new fields per entry),
  `backend/logic.py` (`compute_impact`).
- Dataset must be regenerated after the table is extended.
- Not in scope: per-facility cooling-technology detection (that's a bigger,
  separate effort — this change only gets to per-country granularity).
