## 1. Schema

- [x] 1.1 Add optional `build_date` field (`"YYYY-MM"` string, or
      `"YYYY"` when only a year is confidently known, or absent when
      unknown) to `backend/data/datacenters.json` entries — populated for
      44 of 318 facilities from a verified bulk source (see 1.2); the
      rest are intentionally left absent rather than guessed.
- [x] 1.2 Populate `build_date` from a bulk source where available;
      leave absent otherwise. The main `EPOCH_CSV_URL`
      (`data_centers.csv`) has no date column, but Epoch AI also
      publishes `https://epoch.ai/data/data_centers/data_center_timelines.csv`
      — a per-facility construction-progress log (77 facilities, 433
      dated observations) with a `Buildings operational` flag, built from
      satellite imagery, filings, and press coverage, each row cited
      inline. For each facility, took the earliest dated row where
      `Buildings operational` first flips to `1.0`, restricted to dates
      on or before today (2026-08-03) to exclude Epoch's own forward
      construction estimates. 44 of the 77 timeline facilities had a
      confirmed past date and matched our dataset by exact name (1,
      "DayOne Kempas", isn't in our dataset). Two dates that were
      Epoch's own year-level placeholders (`2024-01-01` for Google
      Lancaster, `2021-01-01` for Microsoft Project Osmium — both
      explicitly described as estimates in Epoch's notes, not a specific
      observed date) were downgraded to year-only precision rather than
      implying false month-level precision. `trackpolicy-datacenters`
      was archived without landing a reusable merge script, so it wasn't
      used as a second source this pass; the remaining 274 facilities
      (mostly outside Epoch's frontier-AI/hyperscaler timeline coverage —
      older/regional colocation sites) have no verified bulk source yet
      and are left `null`. This was a one-time manual backfill, not wired
      into `fetch_data.py`'s automated run, since the timelines CSV needs
      the "first operational" derivation logic above rather than a
      straight column copy.

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
- [x] 4.4 Manual: verified via API — started backend and frontend
      locally, confirmed `GET /api/datacenters/colossus-2` and
      `GET /api/datacenters` return `"build_date": "2025-10"` for
      Colossus 2 (and the other 43 backfilled facilities) unchanged from
      the dataset, and confirmed via component tests that the detail
      panel renders "Built {Month Year}" (or "Built {Year}" for
      year-only precision) when present and no build-date line when
      absent
