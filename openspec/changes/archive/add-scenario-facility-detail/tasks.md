## 1. App-level wiring

- [x] 1.1 In `App.jsx`, compute the selected facility's scenario record
      (`scenarioData?.data_centers.find(dc => dc.id === selectedId)`)
      alongside the existing baseline `selectedDC` lookup
- [x] 1.2 Pass this as a `scenarioDc` prop to `DataCenterCard`, `undefined`/
      `null` when no scenario is active or the facility isn't in the
      scenario's `facility_ids` scope

## 2. DataCenterCard

- [x] 2.1 Accept `scenarioDc` prop; when present, render each stat
      (homes powered, annual draw, price lift, water withdrawal/severity,
      annual CO2, cars equivalent, renewable %, waste heat) as
      baseline → scenario, reusing the delta arrow/color convention from
      `ScenarioPanel.jsx`'s `TotalsRow`
- [x] 2.2 When `scenarioDc` is present but a given value is unchanged from
      baseline, show it plainly without an arrow (avoid visual noise for
      fields the active scenario doesn't touch — e.g. land footprint under
      a renewable-mandate scenario)
- [x] 2.3 Add a small header/badge on the card when scenario data is being
      shown (e.g. "Under: Grid Decarbonization") so it's clear the card
      isn't just displaying live baseline data

## 3. Tests

- [x] 3.1 `DataCenterCard.test.jsx` (new, if one doesn't already exist):
      renders baseline-only when `scenarioDc` is absent (no regression);
      renders baseline → scenario deltas when `scenarioDc` is present;
      unchanged fields render without a delta arrow
- [x] 3.2 Update/add an `App.jsx` test (if App-level tests exist by then)
      or a manual check confirming the right scenario record is matched to
      the right facility by id

## 4. Verification

- [x] 4.1 `cd frontend && npm test` passes
- [x] 4.2 Manual: apply a scenario, click a facility marker, confirm the
      detail card shows baseline → scenario deltas matching the numbers
      implied by the aggregate totals panel; close the scenario (reset)
      and confirm the same facility's card reverts to baseline-only
      rendering
