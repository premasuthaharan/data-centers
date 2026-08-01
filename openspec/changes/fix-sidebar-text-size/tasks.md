## 1. Audit current sizes

- [ ] 1.1 List every `font-size` declaration in `App.css` that applies to
      sidebar/panel/modal content (excludes map overlay title, legend,
      near-me trigger button, and other non-panel chrome, which are out
      of scope) and group them into the three tiers described in the
      proposal (primary/secondary/label)

## 2. Apply the new scale

- [ ] 2.1 Bump label/eyebrow tier 10px → 12px:
      `.dc-section-label`, `.chip-label`, `.scenario-totals-heading`
- [ ] 2.2 Bump secondary/meta tier 11px → 13px:
      `.impact-note`, `.dc-detail-meta`, `.dc-address`,
      `.dc-precision-warning`, `.scenario-panel-subtitle`,
      `.scenario-preset-desc`, `.scenario-totals-arrow`,
      `.near-me-item-distance`, `.near-me-item-stats`
- [ ] 2.3 Bump primary/body tier 12px → 14px:
      `.stat-row`, `.app-subtitle` (if shared — confirm it's not
      exclusively map-chrome), `.dc-detail-stats`/`.dc-announced-notice`,
      `.impact-block-title`, `.scenario-panel-subtitle` (if not already
      covered above), `.scenario-preset-label`, `.scenario-reset-btn`,
      `.scenario-status`, `.scenario-totals-row`, `.compare-picker-item`
      (or its replacement from [[redesign-compare-facility-picker]]),
      `.compare-hint`, `.compare-table`
- [ ] 2.4 Bump title tier proportionally: `.dc-detail-name` 15px → 16px,
      `.scenario-panel-title` 15px → 16px, `.compare-modal-title` 15px →
      16px, `.chip-val` 13px → 15px

## 3. Layout adjustments (only if needed)

- [ ] 3.1 After applying the new sizes, visually check `.stat-row` and
      `.scenario-totals-row` (label + value on one line) for cramped
      wrapping; widen `.detail-panel-wrapper` from `380px` only if
      needed, not preemptively
- [ ] 3.2 Check `.dc-detail-stats` stat chips (`.dc-stat-chip`) still fit
      three across without text truncation at the new sizes

## 4. Verification

- [ ] 4.1 `cd frontend && npm test` passes (no component logic changed,
      but confirm no test asserts on specific pixel values)
- [ ] 4.2 Manual: open each of the four panels (facility detail card,
      scenario panel, methodology panel, compare modal) and visually
      confirm consistent, comfortably readable body text across all four,
      with no overlapping/clipped/wrapped content introduced by the
      larger sizes
