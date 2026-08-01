## 1. Audit

- [ ] 1.1 Confirm current contrast ratios against the `#0d0d14` panel
      background (and `rgba(10, 10, 20, 0.82/0.92)` overlay backgrounds)
      for `#475569` and `#64748b`, and the target `#94a3b8`, using the
      WCAG 2.1 relative-luminance formula — verify `#94a3b8` clears 4.5:1
      before adopting it everywhere

## 2. Replace poor-contrast colors

- [ ] 2.1 Replace `#475569` with `#94a3b8` (or the chosen replacement) in:
      `.app-freshness`, `.dc-address`, `.dc-precision-warning` (check —
      currently `#ffcc00`, may not need changing), `.impact-note`,
      `.dc-section-label`, `.chip-label`, `.scenario-totals-arrow`
- [ ] 2.2 Replace `#64748b` with the same or a suitable near-white shade
      in: `.app-subtitle`, `.dc-detail-meta`, `.stat-label`,
      `.scenario-panel-subtitle`, `.compare-hint`, `.scenario-status`,
      `.near-me-item-distance`, `.scenario-totals-baseline`,
      `.scenario-preset-desc`
- [ ] 2.3 Bump `.dc-close-btn` and `.near-me-close` (icon-only ✕ buttons)
      to the same corrected color for their default (non-hover) state

## 3. Verification

- [ ] 3.1 Re-run the contrast calculation on every changed color against
      its actual background to confirm ≥4.5:1 (or ≥3:1 only for
      large-scale text, per WCAG's large-text exception)
- [ ] 3.2 `cd frontend && npm test` passes (no component logic changed)
- [ ] 3.3 Manual: open the map title overlay, `MethodologyPanel`,
      `DataCenterCard`, `ScenarioPanel`, and `NearMePanel`, visually
      confirm all secondary text is now comfortably readable against its
      background, and that nothing looks washed out from over-brightening
      text that didn't need it (e.g. dividers/borders should still read as
      subtly muted relative to actual content)
