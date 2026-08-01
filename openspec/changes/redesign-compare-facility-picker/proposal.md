## Why

`CompareModal.jsx`'s facility picker (`.compare-picker`) renders one
checkbox + label per facility, wrapped across the top of the modal. With
75 facilities in the current dataset this renders as a dense, unlabeled
grid of ~75 checkboxes that's slow to scan and only gets worse as the
dataset grows (the project's own `Makefile`/`fetch_data.py` pipeline is
designed to add more facilities over time, not fewer). There's no way to
search, filter, or otherwise narrow the list — a user who wants to compare
two specific named facilities has to visually hunt through the whole grid.

## What Changes

- Replace the checkbox grid in `CompareModal.jsx` with a searchable
  multi-select: a text input filters the facility list as the user types
  (matching on `name` and `operator`, case-insensitive substring match,
  consistent with how filtering is already framed conceptually in
  `NearMePanel`'s ranked-list results); matching facilities appear in a
  dropdown/list to click and add.
- Selected facilities render as removable chips/tags above the input
  (click a chip's "×" to remove it from the comparison), replacing the
  current always-visible full list of checkboxes.
- Keep the existing 2-minimum-selection behavior and the comparison table
  below unchanged — this change is scoped to the picker UI only, not the
  table rendering (`ROWS`/`compare-table` in `CompareModal.jsx` stay as-is).
- Cap the visible dropdown list to a reasonable scrollable height (e.g.
  matching `.near-me-card`'s `max-height: 70dvh` pattern) so it doesn't
  grow unbounded either, even when the search input is empty and every
  facility matches.

## Impact

- Affected code: `frontend/src/components/CompareModal.jsx`,
  `frontend/src/App.css` (new picker styles, replacing `.compare-picker`/
  `.compare-picker-item`), `frontend/src/components/__tests__/
  CompareModal.test.jsx` (existing checkbox-based interactions need
  rewriting for the new search/chip interaction model).
- No backend changes — this is a pure frontend interaction redesign of an
  already-shipped panel ([[add-scenario-compare-ui]]).
- Independent of [[fix-sidebar-text-size]] (different files/concerns) —
  can ship in either order or in parallel.
