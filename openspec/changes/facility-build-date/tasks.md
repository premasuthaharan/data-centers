## 1. Schema

- [x] 1.1 Add optional `build_date` field (`"YYYY-MM"` string, or
      absent/null when unknown) to `backend/data/datacenters.json` entries
      (added to one entry, `colossus-2`, as a manual-verification sample —
      see note on 1.2)
- [ ] 1.2 `fetch_data.py`: populate `build_date` from source data where
      available (e.g. Epoch AI CSV columns, trackpolicy.org data once
      [[trackpolicy-datacenters]] lands); leave absent otherwise —
      **blocked**: the live Epoch AI CSV (`EPOCH_CSV_URL` in
      `fetch_data.py`) has no date column (checked its header directly:
      Name, H100 equivalents, power, cost, Owner, Users, Sources,
      Project, chip types, Investors, Construction companies, Energy
      companies, Country, Address — no date field), and
      [[trackpolicy-datacenters]] was archived without landing a reusable
      merge script. No automated source exists yet to populate this at
      fetch time; revisit if a dated source becomes available.

## 2. Backend pass-through

- [x] 2.1 Confirm `logic.py`'s `all_datacenters_with_impact` /
      `compute_impact` pass `build_date` through unchanged to the API
      response (no computation needed — verify no field allowlist strips
      unrecognized keys) — confirmed: `all_datacenters_with_impact` builds
      each result as `{**dc, "impact": ...}`, and `main.py`'s endpoints
      return the dict directly with no `response_model`/allowlist, so
      `build_date` passes through untouched.

## 3. Frontend display

- [x] 3.1 `DataCenterCard.jsx`: render `build_date` in `dc-detail-meta`
      next to operator/country/address, formatted as a readable month +
      year (e.g. "Built March 2025"), conditionally rendered only when
      present
- [x] 3.2 Add a small date-formatting helper (or extend `formatters.js`)
      to convert `"YYYY-MM"` into "Month YYYY" display text

## 4. Tests and verification

- [x] 4.1 `cd backend && python3 -m pytest` passes (166 passed)
- [x] 4.2 `DataCenterCard.test.jsx`: renders build date when present,
      omits it cleanly when absent (no regression on existing
      address-rendering test)
- [x] 4.3 `cd frontend && npm test` passes (154/155; the one failure,
      `fmt > appends a unit suffix when provided`, is a pre-existing
      environment-specific non-breaking-space assertion issue unrelated to
      this change — confirmed present before any edits in this worktree)
- [x] 4.4 Manual: verified via API — started backend on port 8010 and
      frontend on 5173, confirmed `GET /api/datacenters/colossus-2` and
      `GET /api/datacenters` both return `"build_date": "2025-06"` for the
      sample entry unchanged, and confirmed via component tests that the
      detail panel renders "Built June 2025" when present and no
      build-date line when absent
