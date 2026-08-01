## Why

The app currently shows only the *current, factual* impact of each data
center — there's no way to ask "what if regulation required X?" All impact
math lives in `compute_impact()` in `backend/logic.py`, which reads its
inputs (`renewable_pct`, `carbon_intensity_gco2_per_kwh`,
`water_liters_per_kwh`, `electricity_price_usd_per_kwh`, and the module-level
`PUE`/`UTILIZATION_FACTOR` constants) directly off each record and the
module constants, with no way to override them per-request. There's also no
aggregate/rollup function — every existing endpoint returns per-facility
data only, so there's no way to answer "what's the total footprint across
all facilities" for either the current baseline or a hypothetical policy
scenario.

This is the backend groundwork for a policy-scenario tool: pick a proposed
policy (e.g. "100% renewable mandate," "PUE efficiency standard") and see
how it would change both individual facilities and the aggregate totals,
without touching the underlying dataset.

## What Changes

- Extend `compute_impact(dc, overrides=None, pue=PUE, utilization=UTILIZATION_FACTOR)`
  in `backend/logic.py`: `overrides` is an optional dict of
  `renewable_pct`, `carbon_intensity_gco2_per_kwh`, `water_liters_per_kwh`,
  `electricity_price_usd_per_kwh` that, when present, take precedence over
  the record's own values before running the existing formula. `pue` and
  `utilization` become explicit parameters (defaulting to today's module
  constants) instead of only being read from module scope, so a scenario can
  override them per-request. Default-argument behavior is unchanged, so
  `all_datacenters_with_impact()` and `nearest_datacenters()` keep working
  as-is.
- Add `aggregate_impact(centers_with_impact: list[dict]) -> dict` to
  `backend/logic.py`: sums `annual_kwh`, `annual_co2_tonnes`,
  `daily_withdrawal_mgd`, `annual_cost_millions_usd` across the given
  facilities, plus a count of facilities per `water.severity` bucket.
  Takes already-computed impact records (not raw dicts) so it can be reused
  identically for baseline totals and scenario totals.
- Add `POST /api/scenario` to `backend/main.py`. Request body:
  `{ "scenario": { "renewable_pct"?, "carbon_intensity_gco2_per_kwh"?, "water_liters_per_kwh"?, "pue"? }, "facility_ids"?: string[] }`
  (omitted `facility_ids` applies the scenario to every facility). Response:
  `{ "data_centers": [...recomputed impact for the targeted facilities...], "baseline_totals": {...}, "scenario_totals": {...} }`,
  using `aggregate_impact` for both totals.

## Impact

- Affected code: `backend/logic.py` (`compute_impact`, new
  `aggregate_impact`), `backend/main.py` (new endpoint),
  `backend/tests/test_logic.py`, `backend/tests/test_main.py`.
- Additive only — no existing endpoint's request/response shape changes,
  and `compute_impact`'s new parameters all default to current behavior.
- Enables [[add-scenario-compare-ui]] (frontend scenario panel + map
  re-coloring) and provides the aggregate function that a future per-region
  scorecard view could also reuse.
