## 1. Stat chip label alignment

- [x] 1.1 In `App.css`, add `text-align: center` to `.chip-label` (and
      `.chip-val`, for consistency) so a wrapped two-line label like
      "Capital cost"/"Impact radius" centers each line instead of
      rendering ragged-left
- [x] 1.2 Manual: open a facility detail card, confirm "Power," "Capital
      cost," and "Impact radius" chips all look visually even regardless
      of label wrap

## 2. Grid renewables caveat

- [x] 2.1 Confirm via a quick script over `backend/data/datacenters.json`
      what fraction of facilities share the same `renewable_pct` (already
      known: 66/75 US facilities at 22%, from the flat per-country
      `IMPACT_RATES` table in `fetch_data.py`) so the caveat text is
      accurate, not guessed
- [x] 2.2 Add a brief inline caveat (e.g. a `title` tooltip, or a small
      note) on "Grid renewables" in `NearMePanel.jsx` and
      `DataCenterCard.jsx` clarifying it's a country-level average, not
      measured per facility
- [x] 2.3 Do not change `renewable_pct`'s underlying value or the
      per-country data model — this task is scoped to surfacing the
      existing limitation in the UI only

## 3. Compare Facilities: hide dropdown until focused

- [x] 3.1 In `CompareModal.jsx`, add local state tracking whether the
      search input is focused (or has a non-empty query)
- [x] 3.2 Render `.compare-search-results` only when that state is true;
      `.compare-chip-list` keeps rendering unconditionally regardless of
      focus
- [x] 3.3 Hide the dropdown on blur, but only after a short delay (or via
      a click-outside handler) so clicking a search result before the
      blur-triggered hide fires still registers as a click, not a miss
- [x] 3.4 Update `CompareModal.test.jsx`: dropdown is hidden on initial
      render, appears on input focus, hides again on blur/click-outside;
      existing search/chip-add/chip-remove/table tests still pass
      (adjusted to focus the input first, since results are now
      focus-gated)

## 4. Region Scorecard switcher font size

- [x] 4.1 In `App.css`, bump `.region-metric-btn` (currently 11px) and
      `.region-basis-btn` (currently 10px) to match the panel-button type
      scale `[[fix-sidebar-text-size]]` established elsewhere (e.g.
      `.scenario-preset-btn`/`.near-me-item-btn`)
- [x] 4.2 Check `.region-metric-btn--active`/`.region-basis-btn--active`
      still look correct at the new size (no layout shift/overflow in the
      switcher row)
- [x] 4.3 Manual: open Region Scorecard in both dark and light theme,
      confirm "CO₂ / Water / Power" and "Per km² / Per facility / Total"
      are legible at a size consistent with the rest of the panel

## 5. Policy Scenarios result framing

- [x] 5.1 In `ScenarioPanel.jsx`/`App.css`, unify `.scenario-active-actions`
      (Copy link / Reset to baseline) and `.scenario-totals` into one
      visually-bounded result container — either by moving the actions
      inside the `.scenario-totals` card (above the totals rows) or by
      wrapping both in a shared card/border
- [x] 5.2 Confirm the result container only appears once a preset has
      been applied (existing `activePresetId`/`data` gating), so the
      "here's your result" framing doesn't show prematurely
- [x] 5.3 Update `ScenarioPanel.test.jsx` if markup/selectors changed for
      the actions/totals grouping

## 6. Verification

- [x] 6.1 `cd backend && pytest` passes (no backend changes expected, but
      confirm nothing regressed)
- [x] 6.2 `cd frontend && npm test` passes
- [x] 6.3 Manual pass through all five fixes in both dark and light theme:
      stat chip alignment, renewables caveat visible, compare-modal
      dropdown hidden until focused (chips still visible), region
      scorecard switcher text size, scenario result framed as one unit
