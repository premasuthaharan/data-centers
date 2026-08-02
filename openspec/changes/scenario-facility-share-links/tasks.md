## 1. ScenarioPanel copy-link includes the selected facility

- [ ] 1.1 Pass the currently selected facility id (`App.jsx`'s
      `selectedId`) into `ScenarioPanel` as a new prop (e.g.
      `selectedFacilityId`)
- [ ] 1.2 `ScenarioPanel`'s `copyLink`: when `selectedFacilityId` is
      present, add `facility=<id>` to the encoded URL alongside the
      existing `scenario=...` params

## 2. DataCenterCard copy-link includes the active scenario

- [ ] 2.1 Pass the currently applied scenario's encode inputs (preset id +
      overrides, already available as `scenarioData.presetId` /
      `scenarioData.scenario` in `App.jsx`) into `DataCenterCard` as new
      props
- [ ] 2.2 `DataCenterCard`'s `copyLink`: when a scenario is active, add
      `scenario=...` (via the existing `encodeScenarioParams`) alongside
      the existing `facility=<id>` param

## 3. App.jsx mount-time resolution order

- [ ] 3.1 Sequence the three mount-time concerns so a link with both
      params present resolves correctly on first paint rather than
      flashing baseline-then-scenario: (a) kick off `GET /api/datacenters`
      and, if `?scenario=` is present, `POST /api/scenario` in parallel;
      (b) once both have resolved, resolve `?facility=` against the loaded
      datacenters list; (c) set `selectedId` + `scenarioData` together
      before setting `activePanel`
- [ ] 3.2 When both `?scenario=` and `?facility=` decode successfully, set
      `activePanel: 'detail'` (not `'scenario'`) so the recipient lands on
      the facility card with deltas visible, matching what the sender was
      looking at when they copied the link
- [ ] 3.3 When only `?scenario=` is present (no `?facility=`), preserve
      today's behavior from [[scenario-share-links]] unchanged
      (`activePanel: 'scenario'`)
- [ ] 3.4 When only `?facility=` is present (no `?scenario=`), preserve
      today's behavior from [[facility-share-links]] unchanged

## 4. Tests

- [ ] 4.1 `ScenarioPanel.test.jsx`: copy-link includes `facility=<id>` when
      a `selectedFacilityId` is provided, and omits it when absent (no
      regression on the existing scenario-only copy-link test)
- [ ] 4.2 `DataCenterCard.test.jsx`: copy-link includes `scenario=...` when
      an active scenario is provided, and omits it when absent (no
      regression on the existing facility-only copy-link test)
- [ ] 4.3 `App.test.jsx`: mount with both `?scenario=` and `?facility=`
      present — verify `POST /api/scenario` is called, the correct
      facility is selected, `activePanel` resolves to `'detail'`, and the
      rendered `DataCenterCard` receives the matching `scenarioDc`; mount
      with only one of the two params present and verify each existing
      single-param behavior is unchanged

## 5. Verification

- [ ] 5.1 `cd frontend && npm test` passes
- [ ] 5.2 Manual: apply a scenario, click into a facility, copy the link
      from the facility detail card — confirm the URL carries both
      `scenario=` and `facility=`; open it in a fresh tab and confirm it
      lands directly on that facility's detail card with the same
      baseline → scenario deltas, without the aggregate scenario panel
      flashing first
- [ ] 5.3 Manual: repeat starting the copy from the scenario panel's
      "copy link" (with a facility selected underneath) — confirm the same
      combined URL and resulting behavior
- [ ] 5.4 Manual: confirm scenario-only and facility-only share links (from
      the two source changes) still behave exactly as before
