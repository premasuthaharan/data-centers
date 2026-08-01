## 1. Search input + filtering

- [ ] 1.1 Add a text input to `CompareModal.jsx` above (or replacing) the
      current picker area; track its value in local state
- [ ] 1.2 Filter `comparable` facilities by case-insensitive substring
      match against `name` and `operator`, recomputed via `useMemo`
- [ ] 1.3 Exclude already-selected facilities from the filtered dropdown
      results (no point showing a facility that's already a chip)

## 2. Selected-facility chips

- [ ] 2.1 Render selected facilities as removable chips (name + "×")
      above or below the search input
- [ ] 2.2 Clicking a chip's "×" removes it from `selectedIds` (reuse the
      existing `toggle` function)
- [ ] 2.3 Clicking a search-result item adds it to `selectedIds` and
      clears/resets the search input

## 3. Styling

- [ ] 3.1 Add new CSS classes for the search input, dropdown list, and
      chips in `App.css`, matching the dark theme already established
      (`#13131f` backgrounds, `#1e1e2e` borders, consistent with
      `.near-me-item-btn`/`.scenario-preset-btn` patterns)
- [ ] 3.2 Cap the dropdown's visible height with a scrollable max-height
      (e.g. `max-height: 40dvh; overflow-y: auto`) so an empty search
      doesn't render all 75 facilities unbounded
- [ ] 3.3 Remove now-unused `.compare-picker`/`.compare-picker-item` CSS

## 4. Tests

- [ ] 4.1 Rewrite `CompareModal.test.jsx`'s picker-interaction tests:
      typing in the search input filters results; clicking a result adds
      a chip; clicking a chip's remove button removes it; the "select at
      least 2" hint and comparison table behavior are unchanged
- [ ] 4.2 Keep/adapt the existing "excludes announced facilities" and
      "close on backdrop/✕" tests, updating selectors as needed for the
      new markup

## 5. Verification

- [ ] 5.1 `cd frontend && npm test` passes
- [ ] 5.2 Manual: open Compare Facilities, search by partial name and by
      operator, add 2+ via search results, remove one via its chip,
      confirm the table updates correctly; confirm the dropdown doesn't
      overflow the modal when the search is empty
