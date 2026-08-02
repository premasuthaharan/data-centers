## Why

Secondary/muted text throughout the app uses `#475569` and `#64748b` on
dark panel backgrounds (`#0d0d14` / `rgba(10, 10, 20, ...)`). Measured
against WCAG 2.1's contrast formula, `#475569` comes out to **2.55:1** and
`#64748b` to **4.07:1** — both fail the 4.5:1 minimum for normal text (and
`#475569` even fails the relaxed 3:1 minimum for large text). This is a
real, measurable accessibility problem, not a subjective preference. It's
most noticeable on `MethodologyPanel.jsx` (`.impact-note`, used for nearly
all of that panel's body copy, is `#475569`), and on the map title overlay
(`.app-subtitle` — "75 data centers · Click any to explore its impact" —
and `.app-freshness` — "Data as of August 1, 2026" — at 4.07:1 and 2.55:1
respectively). [[fix-sidebar-text-size]] addresses font *size* across the
same panels; this change addresses *color contrast*, a related but
distinct problem — both should land, in either order.

## What Changes

- Replace `#475569` (2.55:1, fails AA) everywhere it's used for actual
  readable text — `.app-freshness`, `.dc-address`, `.impact-note`,
  `.dc-section-label`, `.chip-label`, `.scenario-totals-arrow` — with
  `#94a3b8` (7.55:1, comfortably passes AA), which is already used
  elsewhere in the app for similar secondary text (`.legend-item`,
  `.stat-sub`, `.scenario-totals-label`) so this also improves visual
  consistency, not just contrast in isolation.
- Replace `#64748b` (4.07:1, just under AA) similarly where it's used for
  body/informational text — `.app-subtitle`, `.dc-detail-meta`,
  `.stat-label`, `.scenario-panel-subtitle`, `.compare-hint`,
  `.scenario-status`, `.near-me-item-distance` — with `#94a3b8` as well,
  or a shade between the two if `#94a3b8` reads as too close to primary
  text weight in side-by-side testing (decide during implementation by
  eye, since exact hex choice is a design judgment call, not something to
  over-specify here).
- Icon-only affordances that happen to use these colors (`.dc-close-btn`,
  `.near-me-close` — the ✕ buttons) are lower priority than text but
  should be bumped too while touching these values, since a barely-visible
  close button is its own usability problem.
- Leave colors used purely for non-text decoration (borders, dividers,
  background tints) unchanged — this change is scoped to text/icon
  foreground colors only.

## Impact

- Affected code: `frontend/src/App.css` only — no component logic
  changes, same shared-class structure as [[fix-sidebar-text-size]] means
  every panel benefits without individual component edits.
- Independent of [[fix-sidebar-text-size]] and
  [[redesign-compare-facility-picker]] — different concern (color vs.
  size vs. interaction), can ship in any order or in parallel; whichever
  lands first, the other should adopt whatever the current values are
  rather than reverting them.
