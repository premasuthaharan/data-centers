## Why

With 318 facilities on the map (up from 75 pre-[[trackpolicy-datacenters]]),
finding a specific one by panning/zooming or scanning the region scorecard
is impractical. "Show data centers near me" (`NearMePanel.jsx`) answers
"what's near me" but not "where is a facility I already know the name or
operator of" — a user who read about a specific site (e.g. "Meta
Prometheus" or "AWS Villanueva de Gállego") has no way to jump straight to
it. `CompareModal.jsx` already has a working name/operator substring
search (`searchResults` in `CompareModal.jsx`), but it's scoped to picking
facilities for comparison, not for map navigation, and it's hidden inside
a modal a user has no reason to open just to find a place.

## What Changes

- Add a small square icon button next to the existing "Show data centers
  near me" trigger (`NearMePanel.jsx`, rendered from `App.jsx`), sized and
  styled to sit alongside it rather than inside it — the two are related
  "find a facility" affordances but distinct actions (nearby vs.
  known-name), so they're separate controls in the same cluster rather
  than a combined widget.
- Clicking the button opens a search panel (new component, e.g.
  `FacilitySearchPanel.jsx`) with a text input that filters the full
  facility list by name or operator substring — same matching logic as
  `CompareModal.jsx`'s existing `searchResults` (case-insensitive
  substring match against `dc.name` and `dc.operator`), extracted into a
  shared helper rather than duplicated a third time.
- Selecting a result calls the same `onFlyTo`/`handleSelect` callback
  already passed to `NearMePanel` — flies the map camera to the facility
  and opens its detail card (`DataCenterCard.jsx`), matching the existing
  near-me result click behavior exactly rather than inventing a new
  selection path.
- Respects the current category filter
  ([[trackpolicy-datacenters]]'s "All" / "Frontier-AI" toggle in
  `App.jsx`) — search results are scoped to whatever's currently shown on
  the map, so a search doesn't surface a facility that's deliberately
  hidden by the active filter.
- Closes on: selecting a result (consistent with `NearMePanel`'s
  `onFlyTo` + implicit dismissal), an explicit close control, or clicking
  outside the panel — matching `CompareModal`'s existing outside-click-to-
  dismiss pattern (`compare-modal-overlay`).
- No backend changes — search is a client-side substring filter over the
  already-fetched `/api/datacenters` response, identical in scope to what
  `CompareModal.jsx` already does today.

## Impact

- Affected code: `frontend/src/App.jsx` (render the new trigger button +
  panel, wire `handleSelect`, pass `scopedDatacenters` per the category
  filter), new `frontend/src/components/FacilitySearchPanel.jsx`,
  `frontend/src/App.css` (new button + panel styles, sized to sit next to
  `.near-me-trigger`). Optionally extract `CompareModal.jsx`'s search-match
  logic into a shared utility (e.g. `frontend/src/utils/facilitySearch.js`)
  used by both components instead of duplicating the substring-match
  logic a second time.
- Affected specs: none (frontend-only, no API contract changes — reuses
  the existing `/api/datacenters` payload already loaded into `App.jsx`
  state).
- No interaction with [[trackpolicy-datacenters]] or
  [[impact-formula-general-purpose-calibration]] beyond respecting
  whatever `category` filter state already exists in `App.jsx` — this
  change doesn't depend on either landing first, but reads more naturally
  after the category toggle exists since "search scoped to current
  filter" is otherwise a no-op.
