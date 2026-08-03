## 1. Shared search logic

- [x] 1.1 Extract `CompareModal.jsx`'s name/operator substring-match logic
      (currently inline in its `searchResults` useMemo) into a shared
      helper, e.g. `frontend/src/utils/facilitySearch.js`
      (`searchFacilities(datacenters, query)`), matching its existing
      case-insensitive substring behavior exactly
- [x] 1.2 Update `CompareModal.jsx` to use the extracted helper instead of
      its inline filter, confirming no behavior change

## 2. Search trigger + panel

- [x] 2.1 Add a small square icon-button trigger next to
      `NearMePanel`'s "Show data centers near me" button in `App.jsx`
      (same visual cluster, distinct control)
- [x] 2.2 New `FacilitySearchPanel.jsx`: text input + live-filtered result
      list using the shared search helper from 1.1, styled consistently
      with `CompareModal.jsx`'s existing search-result list
      (`compare-search-results`/`compare-search-result-btn` classes or
      equivalents)
- [x] 2.3 Wire result selection to the same `handleSelect` callback passed
      to `NearMePanel` (`onFlyTo`), so clicking a result flies the map and
      opens the detail card exactly like a near-me result click
- [x] 2.4 Scope search results to `scopedDatacenters` (the
      category-filtered list already computed in `App.jsx` for the map),
      not the full unfiltered dataset
- [x] 2.5 Close behavior: result selection, explicit close button, and
      outside-click dismissal (matching `CompareModal`'s
      `compare-modal-overlay` pattern)

## 3. Styling

- [x] 3.1 `App.css`: square icon-button style for the new trigger, sized
      to sit next to `.near-me-trigger` without disrupting its existing
      layout/positioning
- [x] 3.2 Panel styling consistent with existing overlay panels
      (detail-panel-wrapper / near-me-card conventions — dark/light theme
      variables, not hardcoded colors)

## 4. Tests and verification

- [x] 4.1 Unit tests for the extracted `searchFacilities` helper
      (case-insensitivity, name match, operator match, empty query
      returns all, no-match returns empty)
- [x] 4.2 Component test for `FacilitySearchPanel.jsx`: typing filters
      results, selecting a result calls the provided callback with the
      right facility id
- [x] 4.3 `cd frontend && npm test` passes
- [x] 4.4 Manual: search for a facility by name and by operator, confirm
      the map flies to it and the detail card opens; toggle the
      frontier-AI filter and confirm search results respect it; confirm
      outside-click and close button both dismiss the panel
