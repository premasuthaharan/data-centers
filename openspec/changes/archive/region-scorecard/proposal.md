## Why

The archived `add-near-me-panel` proposal explicitly flagged a per-region
"scorecard" view as a deferred future step once that panel shipped. Today
the app only shows per-facility impact — there's no way to see, say, "which
states/countries carry the most aggregate footprint," which is a natural
question once a user has explored a few individual facilities.
[[add-scenario-aggregate-backend]] introduces `aggregate_impact()` for
summing impact across a set of facilities; this change reuses it grouped by
region rather than duplicating rollup logic.

## What Changes

- Add `GET /api/regions` to `backend/main.py`: groups all facilities by
  `country` (or a finer region field if one exists in the dataset) and
  returns, per region, the result of `aggregate_impact()` over that
  region's facilities plus a facility count — reusing the existing
  function rather than writing a new rollup.
- Add `components/RegionScorecard.jsx`: an overlay panel (consistent with
  existing panel patterns) listing regions ranked by a selectable metric
  (total CO2, water severity mix, total power), each entry showing its
  aggregate stats and an action to filter/fly the map to that region's
  facilities (reusing existing map-centering/filtering mechanisms rather
  than introducing new ones).
- `App.jsx`: add an entry point to open the scorecard (alongside the
  existing near-me and, once shipped, scenario/compare entry points) and
  wire the "focus this region" action into `Map.jsx`'s existing
  centering/selection flow.

## Impact

- Affected code: `backend/main.py` (new `GET /api/regions` endpoint),
  `backend/logic.py` (region-grouping helper, if not trivially doable
  inline in `main.py`), `backend/tests/test_main.py`, new
  `frontend/src/components/RegionScorecard.jsx`, `frontend/src/App.jsx`,
  associated frontend tests.
- Depends on [[add-scenario-aggregate-backend]] shipping first
  (`aggregate_impact()`); does not depend on [[add-scenario-compare-ui]].
- Additive only — no existing endpoint's shape changes.
