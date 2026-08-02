## Why

A round of hands-on use turned up five small but real rough edges, none
related to each other, across parts of the UI that shipped in earlier
changes ([[add-scenario-facility-detail]], [[redesign-compare-facility-picker]],
[[region-scorecard]], the original scenario panel):

1. **`DataCenterCard.jsx`'s stat chips look uneven.** "Capital cost" and
   "Impact radius" are two-word labels that wrap to a second line inside
   `.dc-stat-chip`; "Power" doesn't. `.chip-label` has no `text-align` set,
   so the wrapped second line renders ragged-left inside a
   horizontally-centered flex column instead of centering itself, making
   those two chips look visually off relative to "Power."
2. **Grid renewables is (almost) always 22%.** This isn't a bug in the
   severity-coloring work ([[add-severity-color-coding]]) — it's the
   underlying data: `IMPACT_RATES` in `fetch_data.py` assigns renewable
   share per *country*, and 66 of the current 75 facilities (88%) are in
   the United States, which has one flat `renewable_pct: 22` for the whole
   country regardless of which state/regional grid a facility actually
   sits on. The number is real, just coarse enough that most of the UI
   shows the same value — worth a visible caveat so it doesn't read as
   broken.
3. **The Compare Facilities search dropdown is always open.** Since
   [[redesign-compare-facility-picker]] shipped, `CompareModal.jsx`
   renders all (unselected) facilities in `.compare-search-results`
   unconditionally, whether or not the user has touched the search input —
   so opening the modal immediately dumps a long scrollable list before
   anyone's searched for anything. Selected chips should stay put; only
   the result list should be gated on focus.
4. **Region Scorecard's metric/basis switcher text is too small.**
   `.region-metric-btn` (11px) and `.region-basis-btn` (10px) in
   `App.css` were never brought up to the panel-body type scale that
   [[fix-sidebar-text-size]] applied to `DataCenterCard`/`ScenarioPanel`/
   `MethodologyPanel`/`CompareModal` — [[region-scorecard]] shipped in an
   earlier PR (#21) than the sidebar-text-size fix (#26) and this
   scorecard-specific switcher wasn't part of that later change's scope,
   so it was missed.
5. **The Policy Scenarios result doesn't read as "the result of clicking
   a preset."** `.scenario-totals` (the baseline → scenario numbers) is
   already its own card, but `.scenario-active-actions` ("🔗 Copy link" /
   "Reset to baseline") sits above it as two flat, disconnected buttons
   with a visible gap and no shared border/label — so the whole
   preset-list → buttons → totals-card sequence reads as three unrelated
   stacked pieces rather than "you clicked a preset, here's what
   happened."

## What Changes

- `App.css`: give `.chip-label` (and `.chip-val`, for consistency)
  `text-align: center` so multi-line labels center each line rather than
  rendering ragged-left inside `.dc-stat-chip`'s centered column.
- `NearMePanel.jsx`/`DataCenterCard.jsx`: add a brief inline caveat (title
  attribute or small note) on the "Grid renewables" stat clarifying it's a
  country-level average, not facility-specific — scoped to *surfacing* the
  existing limitation, not changing the underlying per-country data model
  (that's a separate, larger data-quality effort, out of scope here).
- `CompareModal.jsx`: track an `isSearchFocused` (or equivalent) state;
  render `.compare-search-results` only while the search input has focus
  or has a non-empty query, and hide it on blur (with a short delay, or a
  click-outside handler, so clicking a result before the blur-triggered
  hide fires still registers). `.compare-chip-list` keeps rendering
  unconditionally regardless of focus state.
- `App.css`: bump `.region-metric-btn` and `.region-basis-btn` font sizes
  to match the sibling panel-button scale already established by
  [[fix-sidebar-text-size]] (e.g. `.scenario-preset-btn`/`.near-me-item-btn`
  pattern), and their `--active` states if a size mismatch would otherwise
  make the active state look different in size, not just color.
- `ScenarioPanel.jsx`/`App.css`: wrap `.scenario-active-actions` and
  `.scenario-totals` in one visually-unified result container (shared
  card/border, or move the actions inside the `.scenario-totals` card
  itself above the totals rows) so the whole "preset clicked → here's the
  effect" sequence reads as one connected result rather than two
  disconnected pieces. Exact layout (actions above totals inside one card,
  vs. a wrapping card around both) left to implementation — the goal is a
  single visually-bounded "here's your result" unit, not a specific pixel
  layout.

## Impact

- Affected code: `frontend/src/App.css` (chip label alignment, region
  switcher font sizes, scenario result container styling),
  `frontend/src/components/CompareModal.jsx` (search dropdown focus
  gating), `frontend/src/components/NearMePanel.jsx` and
  `frontend/src/components/DataCenterCard.jsx` (renewables caveat),
  `frontend/src/components/ScenarioPanel.jsx` (result container markup),
  plus their existing tests where markup/behavior changes touch test
  selectors.
- No backend changes and no change to `renewable_pct`'s underlying value —
  this only adds an inline caveat where it's displayed. A future change
  could add per-state/regional US grid mix data if finer granularity is
  wanted; that's explicitly out of scope here.
- Independent, unrelated fixes bundled into one change because each is
  individually too small to warrant its own proposal — can be implemented
  and verified in any order.
