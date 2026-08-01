## Why

[[add-scenario-compare-ui]] adds a `ScenarioPanel.jsx` that applies a policy
preset (or custom overrides) and stores the result in React state only. As
soon as the tab is refreshed or the URL is shared, that scenario is lost —
there's no way to send someone a link that says "look at the map under a
100% renewable mandate." For a tool meant to make policy tradeoffs
tangible, the ability to share a specific scenario is close to the core
value proposition, not a nice-to-have.

## What Changes

- Encode the active scenario into the URL as query params (e.g.
  `?scenario=renewable-100` for presets, or `?scenario=custom&renewable_pct=80&pue=1.1`
  for custom overrides) using `URLSearchParams` + `history.pushState` —
  no routing library is introduced, consistent with the app's current
  single-screen, `URLSearchParams`-free-but-router-free architecture.
- Add `frontend/src/utils/scenarioUrl.js`: pure `encodeScenarioParams(scenario)` /
  `decodeScenarioParams(searchParams)` helpers, so encode/decode logic is
  unit-testable independent of React.
- `App.jsx`: on mount, check for scenario params; if present, call
  `POST /api/scenario` with the decoded payload and set `activePanel:
  'scenario'` before/alongside the initial `/api/datacenters` fetch so a
  shared link opens directly into the right view instead of the default
  baseline map.
- `ScenarioPanel.jsx`: add a "copy link" button that writes the current
  scenario's shareable URL to the clipboard, next to the existing
  apply/reset controls.
- Update the URL (without a page reload) whenever the applied scenario
  changes, so the browser's address bar always reflects what's on screen
  and the back/forward buttons behave reasonably.

## Impact

- Affected code: `frontend/src/App.jsx`, `frontend/src/components/
  ScenarioPanel.jsx`, new `frontend/src/utils/scenarioUrl.js`, new
  `frontend/src/utils/__tests__/scenarioUrl.test.js`.
- Depends on [[add-scenario-aggregate-backend]] (`POST /api/scenario`) and
  [[add-scenario-compare-ui]] (`ScenarioPanel.jsx`, `activePanel` state)
  shipping first — this change wires into UI/state that doesn't exist yet.
- No backend changes — reuses `POST /api/scenario` as-is.
- Related to [[facility-share-links]] (same URL-param pattern, may
  share a small amount of URL-handling code in `App.jsx`), but not a hard
  dependency in either direction.
