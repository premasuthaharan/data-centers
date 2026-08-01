## Why

Today the frontend only ever shows the current, factual state of each data
center — a user can look, but can't ask "what if a policy changed this?" or
put two facilities side by side. [[add-scenario-aggregate-backend]] adds the
backend support for recomputing impact under a hypothetical policy
(`POST /api/scenario`) and for facility comparison (existing per-facility
impact data); this change wires that up in the UI: a scenario control panel
that recolors/resizes the map and updates aggregate totals live, plus a
compare view for looking at multiple facilities side by side.

## What Changes

- Add `components/ScenarioPanel.jsx`: an overlay panel (same pattern as the
  existing `DataCenterCard` slide-in) offering preset policy buttons
  ("100% Renewable Mandate," "Grid Decarbonization," "PUE Efficiency
  Standard," "Water Recycling Requirement," a combined "Aggressive Policy"),
  plus an apply/reset toggle and a baseline-vs-scenario totals summary.
  Calls `POST /api/scenario` and stores the result in `App.jsx` state.
- Add `components/CompareModal.jsx`: lets a user select 2+ facilities and
  view their impact stats side by side in a table, reusing the formatting
  conventions from `DataCenterCard.jsx` / `formatters.js`.
- `App.jsx`: replace the single-purpose `selectedId` toggle with an
  `activePanel: 'detail' | 'scenario' | 'compare' | null` state, plus
  `scenarioData` holding the latest `/api/scenario` response. No routing
  library is introduced — this stays one screen with overlay panels,
  consistent with the current architecture.
- `Map.jsx` / `mapHelpers.js`: when a scenario is active, marker color/size
  is driven by `scenarioData.data_centers` instead of the baseline dataset,
  so the map visibly changes when a policy is applied.

## Impact

- Affected code: `frontend/src/App.jsx`, `frontend/src/components/Map.jsx`,
  `frontend/src/components/mapHelpers.js`, new `ScenarioPanel.jsx` and
  `CompareModal.jsx`, plus new tests under
  `frontend/src/components/__tests__/`.
- Depends on [[add-scenario-aggregate-backend]] shipping first
  (`POST /api/scenario`).
- No backend changes in this proposal.
