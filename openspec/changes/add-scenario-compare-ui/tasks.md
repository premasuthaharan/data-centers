## 1. App-level state

- [ ] 1.1 Replace `selectedId`-only toggle in `App.jsx` with
      `activePanel: 'detail' | 'scenario' | 'compare' | null` (keep
      `selectedId` for which facility is in the detail panel)
- [ ] 1.2 Add `activeScenario` (current preset/custom overrides) and
      `scenarioData` (latest `/api/scenario` response) state to `App.jsx`

## 2. ScenarioPanel

- [ ] 2.1 Build `components/ScenarioPanel.jsx` with preset buttons mapped to
      override payloads (see table in proposal), a custom-override mode, and
      apply/reset controls
- [ ] 2.2 Wire "apply" to call `POST /api/scenario` and store the response in
      `scenarioData`; wire "reset" to clear it
- [ ] 2.3 Render a baseline-vs-scenario totals summary (annual CO2, water
      MGD, cost) using `scenarioData.baseline_totals` /
      `scenarioData.scenario_totals`

## 3. Map re-coloring

- [ ] 3.1 In `mapHelpers.js`, extract/adjust marker color+radius logic to
      accept either the baseline dataset or `scenarioData.data_centers`
- [ ] 3.2 In `Map.jsx`, source markers from `scenarioData.data_centers` when
      a scenario is active, else the baseline dataset

## 4. CompareModal

- [ ] 4.1 Build `components/CompareModal.jsx`: facility multi-select (e.g.
      checkboxes in a list, or shift-click on markers) and a side-by-side
      stat table for selected facilities
- [ ] 4.2 Reuse `formatters.js` for consistent number/unit formatting with
      `DataCenterCard.jsx`

## 5. Tests

- [ ] 5.1 `ScenarioPanel.test.jsx`: preset selection calls the API with the
      right payload; totals render correctly from a mocked response
- [ ] 5.2 `mapHelpers.test.js` (new): marker color/radius pure functions
      given baseline vs. scenario data
- [ ] 5.3 `CompareModal.test.jsx`: selecting facilities renders the expected
      table rows

## 6. Verification

- [ ] 6.1 `cd frontend && npm test` passes
- [ ] 6.2 Manual: apply each preset in a running app and confirm marker
      colors/radii and totals update; reset returns to baseline; compare 2+
      facilities and confirm stats match their individual detail cards
