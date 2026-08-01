## Why

The archived `document-endpoints-and-methodology` and
`cite-impact-formula-sources` changes produced dev-facing docs
(`backend/README.md`, `backend/SOURCES.md`) explaining data provenance and
formula constants — but neither is reachable from the running app. A site
visitor has no way to see where the data comes from or how impact numbers
are calculated, which matters for a tool whose credibility depends on its
methodology being transparent. There's also currently no authorship
attribution anywhere in the product.

## What Changes

- Add an in-app "Data Sources & Methodology" overlay panel (same
  slide-in/overlay pattern as `DataCenterCard.jsx`, no new routing
  library), summarizing: Epoch AI as the base dataset, Nominatim
  geocoding, the per-country grid table, and how each impact metric
  (carbon, water, cost, cars/homes equivalence) is derived — content
  drawn from and linking back to the existing `backend/README.md` and
  `backend/SOURCES.md` rather than re-deriving the methodology narrative
  from scratch.
- Include an "About this project" line crediting Prema Suthaharan as
  author, linking to `https://premasuthaharan.com`.
- Add a small, persistent entry point in `App.jsx` (e.g. an "i" info
  button near the title overlay or legend) to open the panel — visible at
  all times, not buried behind facility selection.

## Impact

- Affected code: new `frontend/src/components/MethodologyPanel.jsx`,
  `frontend/src/App.jsx` (entry point + panel open/close wiring), minor
  content additions to `backend/README.md`/`backend/SOURCES.md` if
  anything needs restating for a lay audience (technical accuracy should
  stay in those files; the in-app panel summarizes/links rather than
  duplicates).
- Purely additive frontend UI and static content — no backend or API
  changes, no dependency on any other in-flight change.
