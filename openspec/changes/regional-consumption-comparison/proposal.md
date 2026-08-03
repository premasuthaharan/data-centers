## Why

`DataCenterCard.jsx` already computes household-equivalent framing for a
facility in isolation (`water.households_equivalent`, "Households
equivalent" stat row under the Water block) — but a raw "X households"
number has no local scale reference. A user can't tell whether that's a
rounding error or a huge share of the county's actual water/power use
without knowing what else draws from the same regional resources.
trackpolicy.org-style framing ("this facility uses as much water as N
homes") is more persuasive when it's benchmarked against real regional
consumers — agriculture, industry, or the county's total residential
draw — rather than presented as an isolated number.

**Where this appears in the UI**: inside the existing facility detail
panel (`DataCenterCard.jsx`), not a new top-level view. Specifically, a
new "In [County/Region]" comparison strip added directly below the
existing Water block's household-equivalent stat (and, if power data
supports it, a parallel one under the Electricity block) — so it reads as
regional context for the number the user is already looking at, not a
separate destination they have to navigate to. This keeps it scoped to
one facility at a time, consistent with the rest of the detail panel,
rather than becoming a new map layer or standalone page.

## What Changes

- New per-facility regional context requires county/region-level
  consumption benchmarks that don't exist in this dataset today —
  `logic.py`'s `regions_with_aggregate_impact` only aggregates by
  *country*, and no county-level water/power consumption-by-sector data
  exists anywhere in the codebase. This is the main scoping risk: the
  comparison is only as credible as the benchmark data behind it.
  - For a first version, recommend county-level total water withdrawal
    and its agriculture/industrial/residential breakdown from public
    USGS data (the National Water Use Science Project publishes exactly
    this, by county, for U.S. facilities — which is what the current
    dataset is concentrated in). This needs county-level geocoding, which
    the dataset doesn't have (addresses have city/state, not county) —
    deriving county from lat/lng (e.g. via a reverse-geocode or a
    county-boundary lookup) is a prerequisite.
  - Power/grid consumption-by-sector benchmarks at county granularity are
    less consistently available than water data; scope the initial
    version to water (where [[facility-build-date]]'s sibling
    proposals already lean on `water_liters_per_kwh` as a real,
    per-facility field) and treat a power/grid version as a stretch goal
    once the data-availability question is answered.
- Backend: new county-level benchmark dataset (`backend/data/
  county_water_benchmarks.json` or similar) plus a `region_context` field
  added to a facility's computed impact (via `logic.py`), giving e.g.
  county total withdrawal, agricultural withdrawal, and residential
  withdrawal for the facility's county.
- Frontend: new "In [County, State]" comparison strip in
  `DataCenterCard.jsx` under the Water block, showing the facility's
  daily withdrawal as a percentage of county totals and next to (not
  replacing) the existing households-equivalent framing — e.g. "3.2% of
  [County]'s total water withdrawal; roughly 1/4 of the county's
  agricultural use."
- Facilities whose county has no benchmark data available simply omit the
  new strip (same conditional-render pattern as `dc-address`) rather than
  showing a broken or estimated comparison.

## Impact

- Affected code: `backend/logic.py` (new `region_context` computation),
  new benchmark dataset file, `backend/fetch_data.py` or a new one-time
  script to derive county from lat/lng and attach benchmark data,
  `frontend/src/components/DataCenterCard.jsx` (new comparison strip
  under the Water block).
- This is a real data-sourcing effort, not just a UI addition — the
  credibility of "this facility uses N% of county water" depends
  entirely on getting real county-level benchmark numbers, not
  estimating them. Recommend scoping the first version to whatever U.S.
  counties have solid public data and explicitly marking others as
  unavailable, rather than extrapolating nationwide.
- Independent of the other changes in this batch and the earlier
  trackpolicy.org batch, though it reads naturally alongside
  [[facility-lifecycle-status]]'s "planned" facilities — regional
  context is arguably more persuasive for a facility that hasn't broken
  ground yet, when the argument is "here's what this will do to local
  water," than for one already operating.
