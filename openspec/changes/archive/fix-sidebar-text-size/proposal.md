## Why

All three right-side slide-in panels (`DataCenterCard.jsx` via
`.dc-detail-panel`, `ScenarioPanel.jsx` via `.scenario-panel`, and
`MethodologyPanel.jsx`, which reuses `.dc-detail-panel`) share a body-text
scale clustered at 10–13px: `.stat-row`/`.stat-value`/`.stat-label` (12px),
`.impact-note` (11px), `.dc-section-label`/`.scenario-totals-heading`
(10px), `.dc-detail-meta`/`.scenario-panel-subtitle` (12px), `.chip-label`
(10px), `.scenario-preset-desc` (11px), `.compare-table` (12px). At these
sizes, and especially combined with the muted grays used for secondary
text (`#64748b`, `#475569`), the panels are hard to read — this is the
densest, most information-heavy part of the UI (the entire point of the
app is showing impact numbers) and currently has the smallest, lowest
contrast type in the product.

## What Changes

- Establish one shared type scale for sidebar/panel body content and apply
  it consistently across `DataCenterCard.jsx`, `ScenarioPanel.jsx`,
  `MethodologyPanel.jsx`, and `CompareModal.jsx`'s table (the modal isn't
  a right-side sidebar but shares several of the same classes, e.g.
  `.compare-table` font-size, and should stay visually consistent with the
  sidebars rather than drift separately). Concretely, raise each tier by
  roughly 2px so relative hierarchy is preserved:
  - Primary values / row content: 12px → 14px (`.stat-row`, `.stat-value`,
    `.compare-table`, `.near-me-item-stats`, `.scenario-totals-row`)
  - Secondary/meta text: 11px → 13px (`.impact-note`, `.dc-detail-meta`,
    `.scenario-panel-subtitle`, `.scenario-preset-desc`)
  - Small labels/eyebrows: 10px → 12px (`.dc-section-label`, `.chip-label`,
    `.scenario-totals-heading`), keeping `text-transform: uppercase` and
    `letter-spacing` as-is since those aid readability at small sizes but
    don't substitute for adequate size
  - Titles (`.dc-detail-name`, `.scenario-panel-title`,
    `.compare-modal-title`, currently 15px) and section icons/stat-chip
    values (`.chip-val`, currently 13px) move up proportionally (15px →
    16px, 13px → 15px) so they still read as clearly larger than body text
- Widen `.detail-panel-wrapper` (currently a fixed `380px`) modestly if the
  larger type causes excessive wrapping on multi-column rows (e.g.
  `.stat-row`'s label/value pair, `.scenario-totals-row`'s baseline →
  scenario values) — verify during implementation rather than widening
  preemptively.
- Explicitly not in scope: color/contrast changes beyond what's needed to
  keep existing muted-gray text legible at the new sizes, and any
  redesign of layout/spacing beyond what the larger type requires to avoid
  cramped wrapping.

## Impact

- Affected code: `frontend/src/App.css` only (no component logic changes —
  this is purely a font-size/spacing adjustment across existing classes).
  Every one of `DataCenterCard.jsx`, `ScenarioPanel.jsx`,
  `MethodologyPanel.jsx`, `NearMePanel.jsx`, and `CompareModal.jsx`
  benefits without their own edits, since they all consume these shared
  classes rather than declaring their own font sizes.
- Independent of [[redesign-compare-facility-picker]] — different concern
  (typography vs. interaction model), can ship in either order or in
  parallel; the new picker UI proposed there should still be built using
  whichever type scale is current at implementation time.
