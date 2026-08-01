## 1. Style the control group

- [x] 1.1 Add a `.mapboxgl-ctrl-group` override in `App.css`: dark
      background (`#13131f` or the overlay `rgba(10, 10, 20, ...)` style,
      matching the surrounding UI), border matching `.dc-stat-chip`/
      `.near-me-trigger`-style borders, consistent border-radius
- [x] 1.2 Style `.mapboxgl-ctrl-group button` hover/active states to match
      other interactive dark-UI elements (e.g. `.app-action-btn:hover`'s
      border-color treatment) — used a subtle white-alpha background
      highlight on hover instead, since the control's buttons are packed
      edge-to-edge (no room for a border-color shift to read clearly)
- [x] 1.3 Confirm the +/−/compass icons remain visible against the new
      dark background — Mapbox renders them as SVG background-images with
      a baked-in color, so this may need an icon-recolor approach (CSS
      filter, or Mapbox's documented control-icon override) rather than a
      plain `color` change, whichever actually works when tested — used
      `filter: invert(1) brightness(1.4)` on `.mapboxgl-ctrl-icon`, which
      reliably recolors the baked-in-dark SVG icons to a bright, visible
      white/light color

## 2. Verification

- [x] 2.1 Manual: load the map, confirm the zoom/compass control group
      now has a dark background consistent with the rest of the UI, with
      clearly visible icons and working hover states — confirmed via
      headless-browser screenshots (default and hover states)
- [x] 2.2 Check the control at a couple of zoom levels/viewport sizes to
      confirm nothing clips or looks different when Mapbox re-renders the
      control (e.g. after a style reload) — confirmed at default 1400x900
      and a smaller 800x600 viewport after zooming in; control renders
      consistently in both
