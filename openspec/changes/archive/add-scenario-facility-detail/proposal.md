## Why

[[add-scenario-compare-ui]] shipped a `ScenarioPanel` that recolors the map
and shows *aggregate* baseline-vs-scenario totals across all facilities,
but clicking an individual marker while a scenario is active still opens
the same `DataCenterCard` built from the plain baseline `datacenters` list
(`App.jsx`'s `selectedDC` is derived from `datacenters`, never from
`scenarioData.data_centers`). So a user can see "total CO2 drops
42,015,561t → 5,403,746t under Grid Decarbonization," but can't click into
Google Arcola specifically and see that *this* facility's CO2 dropped from
266,570t to some scenario value, or that its water severity changed from
moderate to low. The low-level, per-facility story is the more concrete and
persuasive half of "what would this policy actually do" and is currently
missing.

## What Changes

- `App.jsx`: when a scenario is active and a facility is selected, look up
  that facility's scenario-recomputed record from
  `scenarioData.data_centers` (already returned by `POST /api/scenario`,
  no backend change needed) alongside its baseline record, and pass both to
  the detail panel.
- `DataCenterCard.jsx`: accept an optional `scenarioDc` prop. When present,
  each stat row (electricity, water, carbon, land) renders the baseline
  value alongside the scenario value and a delta, using the same
  baseline → scenario visual pattern `ScenarioPanel.jsx` already
  established (arrow, green/red delta coloring) rather than inventing a
  new one.
- No new API calls: `scenarioData.data_centers` already contains a
  recomputed impact record per facility from the existing
  `POST /api/scenario` response — this is purely a frontend wiring change
  to surface data that's already being fetched but currently discarded at
  the per-facility level.

## Impact

- Affected code: `frontend/src/App.jsx`, `frontend/src/components/
  DataCenterCard.jsx`, plus their existing tests.
- No backend changes — depends only on what [[add-scenario-aggregate-backend]]
  already returns.
- Depends on [[add-scenario-compare-ui]] (`ScenarioPanel`, `scenarioData`
  state) having shipped, which it has.
- Purely additive to `DataCenterCard`: when no scenario is active
  (`scenarioDc` absent), rendering is unchanged from today.
