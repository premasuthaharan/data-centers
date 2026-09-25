## Why

The app is now deployed as a shareable v0 (https://data-centers-delta.vercel.app),
and people will open the link on their phones. The layout was built for
desktop only — `App.css` and `index.css` contain no `@media` queries — so
at phone widths (~390px) the floating panels collide:

- The header panel (`.app-title` / `.app-actions` block in `App.jsx`) runs
  past the right edge of the screen and covers the top of the map.
- The legend (`.legend-item` block, bottom-left) overlaps the
  "📍 Show data centers near me" button (bottom-right), hiding most of its
  label.
- The map itself is almost entirely covered, leaving little room to pan or
  tap markers.

The user-facing README currently tells people the app "works best on a
laptop or desktop for now"; this change removes that caveat.

## What Changes

- Add a phone breakpoint (e.g. `@media (max-width: 640px)`) to `App.css`.
- Header panel: fit within the viewport with a 16px gutter, and make it
  compact on phones (smaller subtitle, action buttons in a tighter grid or
  a horizontally scrollable row).
- Legend: collapse behind a toggle on phones so it doesn't permanently
  cover the map or collide with the near-me button.
- Near-me button and panel: keep clear of the legend and Mapbox
  attribution.
- Side panels (facility details, policy scenarios, region scorecard,
  methodology): open as full-width bottom sheets or full-screen overlays on
  phones instead of a fixed-width right-hand column.
- Compare modal: fit the viewport width; let the comparison table scroll
  horizontally inside the modal rather than the page.

## Impact

- Affected code: `frontend/src/App.css` (breakpoint styles),
  `frontend/src/App.jsx` (legend toggle), and possibly
  `components/NearMePanel.jsx`, `components/CompareModal.jsx`.
- No backend or data changes.
- `README.md`: remove the phone caveat from "Known rough edges" once done.
