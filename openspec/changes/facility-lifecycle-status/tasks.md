## 1. Schema

- [x] 1.1 Add `construction_status` field
      (`"operational" | "under_construction" | "planned"`) to
      `backend/data/datacenters.json` entries, defaulting existing entries
      to `"operational"`
- [x] 1.2 `logic.py`: default `construction_status` to `"operational"` when
      absent from an entry (mirrors the existing `data_status` default
      pattern), so older entries or partial test fixtures don't need
      updating

## 2. Backend impact suppression

- [x] 2.1 `compute_impact` (or its caller): suppress/omit computed impact
      figures for `"planned"` facilities the same way capacity-unknown
      (`data_status: "announced"`) facilities are handled today
      (decided frontend-only suppression, matching how `isAnnounced` works
      today — backend always returns computed figures via
      `construction_status`, frontend chooses not to render them)
- [x] 2.2 Decide and implement the `"under_construction"` case — suppress
      impact unless a confirmed `power_mw` exists, matching the
      `data_status` precedent (same frontend-only approach; see
      `shouldSuppressImpact` in `mapHelpers.js`)
- [x] 2.3 Backend tests: `compute_impact`/`all_datacenters_with_impact`
      cover `"planned"` and `"under_construction"` suppression, plus the
      default-`"operational"` fallback for entries missing the field

## 3. Map rendering

- [x] 3.1 `mapHelpers.js`: add a status-aware marker treatment (e.g. a
      `constructionStatus`-driven style) distinct from the existing
      `isAnnounced`/`ANNOUNCED_COLOR` treatment
- [x] 3.2 `Map.jsx`: apply the new marker treatment for
      `"under_construction"`/`"planned"` facilities
- [x] 3.3 Map legend (if one exists) updated to explain the new marker
      states

## 4. Detail card

- [x] 4.1 `DataCenterCard.jsx`: show a construction-status badge near
      `dc-detail-meta`
- [x] 4.2 Suppress/relabel impact stats for `"planned"` facilities,
      reusing the existing `dc-announced-notice` pattern with
      status-appropriate copy

## 5. Compare picker

- [x] 5.1 `CompareModal.jsx`: exclude `"planned"` facilities from the
      compare picker; include `"under_construction"` only when a confirmed
      `power_mw` is present

## 6. Tests and verification

- [x] 6.1 `cd backend && python3 -m pytest` passes
- [x] 6.2 `cd frontend && npm test` passes, including new
      `Map.test.jsx`/`mapHelpers` and `DataCenterCard.test.jsx` coverage
      for the new status states
- [x] 6.3 Manual: with a mix of statuses in the dataset (can use
      `location_overrides.json`-style local edits for testing before real
      data lands), confirm markers, detail card badge, and compare picker
      all reflect status correctly, and that all-`"operational"` behavior
      is pixel-identical to today (verified via a headless-browser pass
      against three temporarily patched facilities: hollow map markers,
      legend row, detail badge + suppression notice, and compare-picker
      exclusion all behaved as designed; reverted before committing)
