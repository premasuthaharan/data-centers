## Why

`DataCenterCard.jsx` already computes household-equivalent framing for a
facility in isolation (`water.households_equivalent`, "Households
equivalent" stat row under the Water block) — but a raw "X households"
number has no scale reference. A user can't tell whether that's a
rounding error or a huge share of regional consumption without knowing
what else draws from the same resources.

County-level USGS consumption-by-sector benchmarks (the approach
originally considered for this change) would require sourcing or
fabricating per-county data for the ~60 US counties this dataset touches
— too large and too unverifiable a research effort to do credibly in one
pass, and the original proposal itself flagged this as the main scoping
risk. Instead, this change uses three comparison framings buildable from
data already in this codebase or sourceable at a coarser, more defensible
grain:

1. **Peer-facility ranking** — how this facility's water/carbon/electricity
   footprint compares to other facilities already in `datacenters.json`.
   Needs no new data; it's a percentile/rank computed from the existing
   dataset, so it's exact by construction.
2. **State-level water stress** — categorical water-stress context (not
   precise withdrawal percentages) for US facilities, following the same
   "WRI Aqueduct categories as informal guidance" pattern already used for
   `IMPACT_RATES` per-country water intensity (see SOURCES.md). Far more
   tractable to source credibly for 50 states than for hundreds of
   counties.
3. **Grid/carbon regional framing** — the dataset already computes
   `carbon.renewable_pct` and `carbon.intensity_gco2_per_kwh` per country
   (`GRID_DATA` in `fetch_data.py`) but only surfaces them as a flat
   number. Framing them against other tracked countries' grids (e.g.
   "greener than 40 of 45 tracked grids") makes existing data more
   legible without requiring anything new to source.

**Where this appears in the UI**: inside the existing facility detail
panel (`DataCenterCard.jsx`), not a new top-level view. Each framing adds
a small comparison line to its corresponding existing block (peer ranking
+ state water stress under the Water block, grid framing under the
Carbon & Air block) — so it reads as context for numbers the user is
already looking at, not a separate destination.

## What Changes

- Backend (`logic.py`):
  - New `peer_context` on a facility's computed impact: percentile rank
    of `water.daily_withdrawal_mgd`, `carbon.annual_co2_tonnes`, and
    `electricity.annual_kwh` among all facilities, plus rank-within-region
    (US: state parsed from `address`; non-US: country). Computed once
    across the full dataset per request, not duplicated per-facility.
  - New `STATE_WATER_STRESS` table: a small, hand-curated categorical
    lookup ("low"/"moderate"/"high"/"extremely high", following WRI
    Aqueduct's own category labels) for US states, documented in
    SOURCES.md the same way `IMPACT_RATES`' per-country water intensity is
    — informal guidance, not measured withdrawal data. Derives state from
    `dc["address"]` by extending the existing state-extraction pattern in
    `fetch_data.py`'s `_simplify_address` rather than duplicating it.
  - New `grid_context`: for a facility's country, its rank and percentile
    among all countries in `GRID_DATA` by `renewable_pct`, so the frontend
    can say "greener than N of M tracked grids" instead of just the raw
    percentage.
- Frontend (`DataCenterCard.jsx`):
  - Water block: add a peer-ranking line ("Uses more water than X% of
    tracked facilities") and, when state is resolved, a water-stress badge
    ("Arizona: extremely high baseline water stress").
  - Carbon & Air block: add a grid-ranking line ("Grid is greener than N
    of M tracked countries' grids").
  - All three are additive — existing stat rows (households-equivalent,
    cars-equivalent, renewable_pct) stay as-is.
  - Facilities where a given comparison isn't available (state can't be
    parsed, country not in `GRID_DATA`) omit just that line, same
    conditional-render pattern as `dc-address`.
- Out of scope for this change: county-level benchmarks, any new external
  data fetch or geocoding step, and a power/grid-consumption-by-sector
  version (still blocked on the same county-data-availability problem
  called out in the original proposal).

## Impact

- Affected code: `backend/logic.py` (new `peer_context`, `grid_context`,
  `STATE_WATER_STRESS`), `backend/fetch_data.py` (reuse/extend state
  parsing), `backend/SOURCES.md` (document `STATE_WATER_STRESS`
  provenance), `frontend/src/components/DataCenterCard.jsx` (new
  comparison lines), tests in `backend/tests/test_logic.py` and
  `frontend/src/components/DataCenterCard.test.jsx`.
- No new external data fetch, no new dataset file, no geocoding
  prerequisite — everything is computed from data already in
  `datacenters.json` plus one small hand-curated state-level categorical
  table.
- Independent of the other changes in this batch and the earlier
  trackpolicy.org batch, though it reads naturally alongside
  [[facility-lifecycle-status]]'s "planned" facilities — peer/grid
  framing works even for a facility that hasn't broken ground yet, since
  it only needs the facility's specs, not measured local data.
