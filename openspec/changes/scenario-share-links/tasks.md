## 1. URL encode/decode helpers

- [ ] 1.1 Add `frontend/src/utils/scenarioUrl.js` with
      `encodeScenarioParams(scenario)` (preset name, or `custom` +
      override key/value pairs) and `decodeScenarioParams(searchParams)`
      (inverse, returns `null` if no valid scenario params present)
- [ ] 1.2 Handle malformed/partial params gracefully (decode returns `null`
      rather than throwing) so a hand-edited or stale URL just falls back
      to the baseline view

## 2. App.jsx wiring

- [ ] 2.1 On mount, decode scenario params from `window.location.search`;
      if present, call `POST /api/scenario` with the decoded payload and
      set `activePanel: 'scenario'` + `scenarioData` from the response
- [ ] 2.2 Whenever `ScenarioPanel` applies or resets a scenario, update the
      URL via `history.pushState` (encode on apply, strip params on reset)
      without a full page reload

## 3. ScenarioPanel copy-link

- [ ] 3.1 Add a "copy link" button to `ScenarioPanel.jsx` that writes the
      current shareable URL to the clipboard and shows a brief confirmation
      (e.g. "Copied!" state for ~2s)
- [ ] 3.2 Disable/hide the button when no scenario is currently applied

## 4. Tests

- [ ] 4.1 `scenarioUrl.test.js`: round-trip encode/decode for a preset,
      round-trip for custom overrides, and malformed-params-returns-null
- [ ] 4.2 `App.test.jsx` (or extend existing): mount with scenario query
      params present, verify `POST /api/scenario` is called with the
      decoded payload and the scenario panel opens pre-applied
- [ ] 4.3 `ScenarioPanel.test.jsx`: copy-link button copies the expected
      URL string given an applied scenario

## 5. Verification

- [ ] 5.1 `cd frontend && npm test` passes
- [ ] 5.2 Manual: apply a preset, click "copy link," open that URL in a
      fresh tab, confirm the scenario auto-applies and the map/totals match
      the original tab; apply a custom override and repeat; reset and
      confirm the URL params clear
