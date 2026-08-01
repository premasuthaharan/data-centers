## 1. CSS variable infrastructure

- [ ] 1.1 Define `:root` custom properties for: panel background,
      overlay background (with its existing alpha values), border color,
      the corrected text-color tiers from [[fix-text-contrast]]/
      [[fix-sidebar-text-size]], accent/indigo color
- [ ] 1.2 Replace hardcoded hex values in `App.css` with `var(--...)`
      references, file by file/section by section, verifying no visual
      change in dark mode as each section is converted (this is a
      mechanical but large-surface-area change — go carefully)
- [ ] 1.3 Add a `:root[data-theme="light"]` (or `.theme-light`) override
      block redefining each variable for a light palette

## 2. Theme toggle

- [ ] 2.1 Add a sun/moon toggle button near the existing info button in
      `App.jsx`'s title overlay
- [ ] 2.2 On click, flip `data-theme` on `document.documentElement` and
      persist the choice to `localStorage`
- [ ] 2.3 On initial load, read `localStorage`; if unset, default to
      `window.matchMedia('(prefers-color-scheme: light)')`

## 3. Map theme

- [ ] 3.1 In `Map.jsx`, switch the Mapbox style URL between `dark-v11`
      and a light equivalent based on the active theme (re-init or
      `setStyle()` on toggle — confirm which is less disruptive to
      existing markers/state)
- [ ] 3.2 Conditionally skip/adjust the custom `setFog(...)` space effect
      for light mode
- [ ] 3.3 Add light-theme variants for `.mapboxgl-popup-content` and the
      `.mapboxgl-ctrl` styling introduced in [[fix-map-control-theme]]

## 4. Tests

- [ ] 4.1 Test the toggle button flips `data-theme` and writes to
      `localStorage`
- [ ] 4.2 Test initial theme resolution: explicit stored preference wins
      over `prefers-color-scheme`; falls back to `prefers-color-scheme`
      when nothing is stored

## 5. Verification

- [ ] 5.1 `cd frontend && npm test` passes
- [ ] 5.2 Manual: toggle between themes and check every panel
      (`DataCenterCard`, `ScenarioPanel`, `MethodologyPanel`,
      `CompareModal`, `NearMePanel`), the map style, and Mapbox
      popups/controls all switch correctly with no leftover hardcoded
      dark-only elements; reload the page and confirm the choice persists
