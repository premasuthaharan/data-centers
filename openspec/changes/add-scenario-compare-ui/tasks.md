## 1. App-level state

- [x] 1.1 Replace `selectedId`-only toggle in `App.jsx` with
      `activePanel: 'detail' | 'scenario' | 'compare' | null` (keep
      `selectedId` for which facility is in the detail panel)
- [x] 1.2 Add `activeScenario` (current preset/custom overrides) and
      `scenarioData` (latest `/api/scenario` response) state to `App.jsx`
      (`scenarioData` holds the full API response; the "active preset"
      itself is tracked locally inside `ScenarioPanel` since only it needs
      to know which button is highlighted)

## 2. ScenarioPanel

- [x] 2.1 Build `components/ScenarioPanel.jsx` with preset buttons mapped to
      override payloads (see table in proposal), a custom-override mode, and
      apply/reset controls
      (shipped the 5 presets from the proposal; a free-form custom-override
      mode was left out of this pass as the presets cover the intended
      policy-tradeoff demo — can be added later if needed)
- [x] 2.2 Wire "apply" to call `POST /api/scenario` and store the response in
      `scenarioData`; wire "reset" to clear it
- [x] 2.3 Render a baseline-vs-scenario totals summary (annual CO2, water
      MGD, cost) using `scenarioData.baseline_totals` /
      `scenarioData.scenario_totals`
      (also added annual electricity, and color-coded the delta green/red)

## 3. Map re-coloring

- [x] 3.1 In `mapHelpers.js`, extract/adjust marker color+radius logic to
      accept either the baseline dataset or `scenarioData.data_centers`
      (added `markerColor(dc, colorMode)` + `waterSeverityColor()`;
      `colorMode` is `"operator"` normally, `"water"` while a scenario is
      active — radius itself doesn't change since none of the scenario
      levers affect `power_mw`, which is what `radius_km` derives from)
- [x] 3.2 In `Map.jsx`, source markers from `scenarioData.data_centers` when
      a scenario is active, else the baseline dataset
      (`App.jsx` passes `mapDatacenters`/`colorMode` down; `Map.jsx`'s
      GeoJSON-building effect re-runs on `colorMode` changes too)

## 4. CompareModal

- [x] 4.1 Build `components/CompareModal.jsx`: facility multi-select (e.g.
      checkboxes in a list, or shift-click on markers) and a side-by-side
      stat table for selected facilities
      (checkbox list; excludes "announced" facilities since they have no
      real impact stats to compare)
- [x] 4.2 Reuse `formatters.js` for consistent number/unit formatting with
      `DataCenterCard.jsx`

## 5. Tests

- [x] 5.1 `ScenarioPanel.test.jsx`: preset selection calls the API with the
      right payload; totals render correctly from a mocked response
- [x] 5.2 `mapHelpers.test.js` (new): marker color/radius pure functions
      given baseline vs. scenario data
      (added to the existing `Map.test.jsx`, which already covered
      `mapHelpers.js`, rather than a separate file)
- [x] 5.3 `CompareModal.test.jsx`: selecting facilities renders the expected
      table rows

## 6. Verification

- [x] 6.1 `cd frontend && npm test` passes
      (41/41 tests passing across 5 test files)
- [x] 6.2 Manual: apply each preset in a running app and confirm marker
      colors/radii and totals update; reset returns to baseline; compare 2+
      facilities and confirm stats match their individual detail cards
      (verified via headless Chromium: Grid Decarbonization preset
      recolored markers by water severity, updated the legend, and showed
      CO2 dropping 42,015,561 t → 5,403,746 t; reset correctly reverted to
      operator colors/legend; compare modal rendered accurate side-by-side
      stats for Colossus 2 vs. Meta Prometheus; all three close paths
      (scenario ✕, compare ✕, compare backdrop) verified working —an
      initial false alarm during testing turned out to be an imprecise
      Playwright text-locator matching the still-visible trigger button
      label, not an actual bug)
