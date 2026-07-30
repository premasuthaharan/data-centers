## Why

`backend/README.md` documents only 2 of the 3 real endpoints (it omits
`GET /api/datacenters` entirely) and says nothing about where the dataset
comes from or how impact metrics are calculated. `frontend/README.md` is
still the generic Vite/React boilerplate with no project-specific content.
Anyone picking this project up (including future-you) has to read the
source to understand data provenance or methodology.

## What Changes

- Rewrite `backend/README.md` to document all 3 endpoints
  (`/api/datacenters`, `/api/locate`, `/api/datacenters/nearest`) with
  request/response shapes.
- Add a "Data Sources & Methodology" section (or link to `SOURCES.md` from
  [[cite-impact-formula-sources]]) covering: Epoch AI as the base dataset,
  Nominatim for geocoding, the per-country grid table, and a summary of how
  each impact metric is derived.
- Replace `frontend/README.md` boilerplate with project-specific setup
  instructions (env vars from [[externalize-deployment-config]], how to run
  against the local backend).

## Impact

- Affected code: `backend/README.md`, `frontend/README.md`. Documentation
  only — no behavior changes.
