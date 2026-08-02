## Why

Three small, purely cosmetic gaps in the current UI:

- `frontend/public/favicon.svg` exists and is wired up
  (`index.html`'s `<link rel="icon">`), but it's a generic abstract
  purple/blue mark left over from scaffolding — not anything that
  represents a data center / map / impact-tracking tool. It doesn't
  identify this app in a browser tab.
- `frontend/src/index.css`'s `font-family: system-ui, "Segoe UI", Roboto,
  sans-serif` is the unstyled default stack — functional but generic,
  with no typographic identity of its own.
- Light mode's palette (`App.css`'s `:root[data-theme="light"]` block,
  lines 34-64) uses fairly saturated, high-contrast colors (`#6366f1`
  accent, near-white/near-black text) — standard "light mode" but not
  the softer pastel look being asked for here.

These three are grouped into one change because they're all
non-interactive, purely visual, touch no application logic, and are most
sensibly reviewed/shipped together as a single "how the app looks"
pass rather than three separate reviews of the same few files.

## What Changes

- **Favicon**: replace `frontend/public/favicon.svg` with a new icon
  reflecting the app's actual subject (e.g. a simple map-pin, server-rack,
  or grid-node motif) rather than the current generic mark. Keep it an
  SVG (matches the existing `<link rel="icon" type="image/svg+xml">` in
  `index.html` — no markup change needed, just the asset itself) and keep
  it legible at favicon size (16-32px), which the current icon's dense
  layered-ellipse-and-blur-filter style is not optimized for.
- **Font**: replace the `system-ui` stack in `index.css` with a specific
  webfont. Needs a concrete choice — recommend a neutral, highly-legible
  sans (e.g. Inter, which is a common, free, well-hinted choice for
  data-dense dashboard UIs like this one) self-hosted or loaded via
  `@font-face` rather than a third-party CDN `<link>`, consistent with
  this app having no other external script/style dependencies today.
  Apply as the base `font-family` in `index.css`, keeping a system-font
  fallback chain after it for load-failure resilience.
- **Light mode pastels**: recolor `App.css`'s `:root[data-theme="light"]`
  block only (dark mode, lines 2-32, is unaffected) toward a softer,
  lower-saturation pastel palette — desaturating `--accent`/
  `--accent-soft` and choosing softer background/panel tones than the
  current near-white `#ffffff`/`#f4f5fa`. Must preserve WCAG AA text
  contrast for `--text-heading`/`--text-primary`/`--text-secondary`
  against the new backgrounds — pastel backgrounds tend to reduce
  contrast, so this needs verification, not just a color swap. Also
  needs to stay consistent with the severity/status color systems that
  already exist independent of theme (`severityColors.js`,
  `ANNOUNCED_COLOR` in `Map.jsx`, water-severity colors) — those are
  functional colors (green=low risk, red=critical) that should NOT be
  pastel-shifted, since doing so could weaken the risk signal they're
  designed to carry. Scope this change to the base theme tokens only.

## Impact

- Affected code: `frontend/public/favicon.svg` (new asset),
  `frontend/src/index.css` (font-family + new `@font-face`/font asset),
  `frontend/src/App.css` (light-theme color tokens only).
- Purely visual — no component logic, API, or data schema changes; dark
  mode is unaffected except insofar as the font-family change applies to
  both themes (fonts aren't theme-scoped, only colors are).
- Independent of every other pending change in this repo; safe to land
  at any point.
- Needs one concrete decision before implementation: which font family.
  Proposal recommends Inter as a default if no preference is stated.
