## 1. Favicon

- [ ] 1.1 Design/source a new favicon SVG reflecting the app's subject
      (map/data-center/grid motif), legible at 16-32px
- [ ] 1.2 Replace `frontend/public/favicon.svg` with the new asset (no
      `index.html` changes needed — the existing `<link>` tag stays)
- [ ] 1.3 Manual: verify the new favicon renders correctly in a browser
      tab and bookmark at actual favicon size, in both light and dark OS
      chrome

## 2. Font

- [ ] 2.1 Choose the font family (recommend Inter absent another
      preference) and source it as a self-hosted asset or local
      `@font-face`, not a third-party CDN link
- [ ] 2.2 Add the font file(s) to `frontend/public/` (or
      `frontend/src/assets/`) and a corresponding `@font-face` rule
- [ ] 2.3 `index.css`: update `font-family` to the new font, keeping
      `system-ui`/sans-serif fallbacks after it
- [ ] 2.4 Manual: confirm the font loads and applies across the app
      (headers, body text, buttons) with no FOUC/layout shift regressions

## 3. Light mode pastel palette

- [ ] 3.1 Recolor `App.css`'s `:root[data-theme="light"]` block
      (`--bg-*`, `--accent`, `--accent-soft`, `--border-default`,
      `--shadow-panel`) toward a softer, lower-saturation pastel palette;
      leave dark mode (`:root`, lines 2-32) unchanged
- [ ] 3.2 Verify WCAG AA contrast for `--text-heading`/`--text-primary`/
      `--text-secondary` against the new `--bg-page`/`--bg-panel`/
      `--bg-card` values
- [ ] 3.3 Confirm severity/status color systems
      (`severityColors.js`, `ANNOUNCED_COLOR`, water-severity colors) are
      left untouched — these are functional risk-signal colors, not
      theme tokens
- [ ] 3.4 Manual: toggle through light mode across all panels (detail
      card, scenario panel, compare modal, scorecard) to confirm the new
      palette reads consistently and nothing looks washed out or
      low-contrast

## 4. Verification

- [ ] 4.1 `cd frontend && npm test` passes (no visual-regression test
      suite exists today, so this is mainly a check that no component
      test asserts on specific color values)
- [ ] 4.2 Manual: side-by-side comparison of light mode before/after
      across the main map view and each overlay panel
