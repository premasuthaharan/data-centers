## 1. CSS variable infrastructure

- [x] 1.1 Define `:root` custom properties for: panel background,
      overlay background (with its existing alpha values), border color,
      the corrected text-color tiers from [[fix-text-contrast]]/
      [[fix-sidebar-text-size]], accent/indigo color
- [x] 1.2 Replace hardcoded hex values in `App.css` with `var(--...)`
      references, file by file/section by section, verifying no visual
      change in dark mode as each section is converted (this is a
      mechanical but large-surface-area change — go carefully) —
      semantic/status colors (warning yellow, success green, error red,
      link blue, announced-notice tan) were intentionally left as literal
      hex since they're brand/semantic, not UI chrome
- [x] 1.3 Add a `:root[data-theme="light"]` (or `.theme-light`) override
      block redefining each variable for a light palette

## 2. Theme toggle

- [x] 2.1 Add a sun/moon toggle button near the existing info button in
      `App.jsx`'s title overlay
- [x] 2.2 On click, flip `data-theme` on `document.documentElement` and
      persist the choice to `localStorage`
- [x] 2.3 On initial load, read `localStorage`; if unset, default to
      `window.matchMedia('(prefers-color-scheme: light)')` — implemented
      via a blocking inline script in `index.html` (avoids a flash of
      wrong theme before React mounts) plus a `resolveInitialTheme()`
      helper in `theme.js` that `App.jsx` uses to initialize state from
      the same logic

## 3. Map theme

- [x] 3.1 In `Map.jsx`, switch the Mapbox style URL between `dark-v11`
      and a light equivalent based on the active theme (re-init or
      `setStyle()` on toggle — confirm which is less disruptive to
      existing markers/state) — used `setStyle()`; layer/source setup was
      refactored into a `setupLayers()` callback re-run on every
      `style.load` (setStyle() wipes sources/layers, so they're
      re-added and immediately re-populated from current data)
- [x] 3.2 Conditionally skip/adjust the custom `setFog(...)` space effect
      for light mode — added a light-toned fog config (white/pale-blue
      space and horizon) instead of skipping it, so the globe edge still
      reads correctly against a light page background
- [x] 3.3 Add light-theme variants for `.mapboxgl-popup-content` and the
      `.mapboxgl-ctrl` styling introduced in [[fix-map-control-theme]] —
      both already consumed CSS variables, so the light overrides apply
      automatically with no extra rules needed

## 4. Tests

- [x] 4.1 Test the toggle button flips `data-theme` and writes to
      `localStorage`
- [x] 4.2 Test initial theme resolution: explicit stored preference wins
      over `prefers-color-scheme`; falls back to `prefers-color-scheme`
      when nothing is stored

## 5. Verification

- [x] 5.1 `cd frontend && npm test` passes
- [x] 5.2 Manual: toggle between themes and check every panel
      (`DataCenterCard`, `ScenarioPanel`, `MethodologyPanel`,
      `CompareModal`, `NearMePanel`), the map style, and Mapbox
      popups/controls all switch correctly with no leftover hardcoded
      dark-only elements; reload the page and confirm the choice persists
      — verified all six via headless-browser screenshots in both light
      and forced-dark colorScheme, plus a toggle-click-reload flow
      confirming localStorage persistence with no console errors
