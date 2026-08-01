## Why

`Map.jsx` adds Mapbox GL JS's built-in `NavigationControl` (zoom in/out +
compass/pitch reset) via `map.current.addControl(new mapboxgl.NavigationControl(), "top-right")`,
but `App.css` has no override for it. Mapbox GL's default control styling
is a white/light button group, which renders as a jarring bright-white
square against every other UI element in the app (title overlay, legend,
detail panels, near-me panel) using dark, semi-transparent backgrounds.
`App.css` already has a precedent for this exact kind of override — the
`.mapboxgl-popup-content` block restyles another Mapbox-owned element to
match the app's theme — but the equivalent was never added for
`.mapboxgl-ctrl`.

## What Changes

- Add a dark-theme CSS override for Mapbox's control group
  (`.mapboxgl-ctrl-group`, `.mapboxgl-ctrl button`) in `App.css`,
  matching the existing dark/semi-transparent panel style (`#13131f` /
  `rgba(10, 10, 20, ...)` backgrounds, `#1e1e2e`-family borders) used
  everywhere else, including hover/active states and the button icon
  color (Mapbox renders icons as SVG background-images with a fixed
  color baked in by default — may need an `svg`/`background-image`
  override or Mapbox's documented icon-color CSS variables, whichever
  actually renders correctly, decide during implementation).

## Impact

- Affected code: `frontend/src/App.css` only (new `.mapboxgl-ctrl*`
  override rules, no component logic changes).
- If [[add-light-mode-toggle]] lands, its light-theme variant should
  reuse whatever class structure this change introduces rather than
  duplicating it — sequence this change first since it's smaller and
  already needed regardless of whether light mode ships.
