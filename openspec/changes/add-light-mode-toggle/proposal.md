## Why

The app is hardcoded to a single dark theme: every color in
`frontend/src/App.css` is a literal hex value (no CSS custom properties),
and `Map.jsx` hardcodes Mapbox's `dark-v11` style plus a custom space/fog
effect tuned for dark mode. There is currently no theme infrastructure at
all — not a CSS variable, not a media query, not a stored preference. A
user who prefers or needs a light UI (glare-prone environments, personal
preference, some accessibility needs) has no option.

## What Changes

- Introduce a small set of CSS custom properties on `:root` for the colors
  currently hardcoded throughout `App.css` (panel backgrounds, borders,
  the text-color tiers being unified in [[fix-text-contrast]] and
  [[fix-sidebar-text-size]], accent color, water-severity colors, etc.),
  and a light-theme override block keyed off a `data-theme="light"`
  attribute on `<html>` (not just `prefers-color-scheme`, so the in-app
  toggle can override the OS setting).
- Add a toggle control (sun/moon icon button, placed near the existing
  info button in the map title overlay) that flips `data-theme` on
  `<html>` and persists the choice in `localStorage`, defaulting to the
  OS's `prefers-color-scheme` on first visit.
- Define a light-theme palette for: panel backgrounds, borders, the four
  text tiers, the accent/indigo color, and the operator/water-severity
  marker color sets (these can likely stay the same hex values in both
  themes since they're brand/semantic colors, not UI chrome — confirm
  during implementation whether any need light-mode-specific adjustment
  for contrast against a light panel background).
- `Map.jsx`: switch the Mapbox style between `mapbox://styles/mapbox/dark-v11`
  and `mapbox://styles/mapbox/light-v11` (or `streets-v12`) based on the
  active theme, and adjust/remove the custom space-fog effect
  (`map.current.setFog(...)`) for light mode, since it's tuned
  specifically for the dark globe look.
- Mapbox's own popup (`.mapboxgl-popup-content`) and control
  (`.mapboxgl-ctrl`, see [[fix-map-control-theme]]) styling need
  light-theme variants too, since both are currently hardcoded dark.

## Impact

- Affected code: `frontend/src/App.css` (introduce CSS variables and a
  light-theme override block — this is the bulk of the work, touching
  effectively every color declaration in the file), `frontend/src/App.jsx`
  (toggle button + `data-theme`/`localStorage` state), `frontend/src/
  components/Map.jsx` (style URL switch, fog effect), new toggle-related
  tests.
- This is a genuinely large change — it touches nearly every rule in
  `App.css` — not a small tweak. Consider landing it after
  [[fix-text-contrast]] and [[fix-sidebar-text-size]] so the light-theme
  palette is derived from the corrected/finalized dark-theme values rather
  than needing to be redone when those land.
- Depends conceptually on [[fix-map-control-theme]] (dark-theming the
  Mapbox zoom controls) — that fix's dark-mode styles become one half of
  this change's light/dark toggle for the same controls; sequence
  [[fix-map-control-theme]] first so this change only has to add the
  light variant, not invent the dark one from scratch.
