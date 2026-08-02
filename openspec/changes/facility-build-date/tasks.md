## 1. Schema

- [ ] 1.1 Add optional `build_date` field (`"YYYY-MM"` string, or
      absent/null when unknown) to `backend/data/datacenters.json` entries
- [ ] 1.2 `fetch_data.py`: populate `build_date` from source data where
      available (e.g. Epoch AI CSV columns, trackpolicy.org data once
      [[trackpolicy-datacenters]] lands); leave absent otherwise

## 2. Backend pass-through

- [ ] 2.1 Confirm `logic.py`'s `all_datacenters_with_impact` /
      `compute_impact` pass `build_date` through unchanged to the API
      response (no computation needed — verify no field allowlist strips
      unrecognized keys)

## 3. Frontend display

- [ ] 3.1 `DataCenterCard.jsx`: render `build_date` in `dc-detail-meta`
      next to operator/country/address, formatted as a readable month +
      year (e.g. "Built March 2025"), conditionally rendered only when
      present
- [ ] 3.2 Add a small date-formatting helper (or extend `formatters.js`)
      to convert `"YYYY-MM"` into "Month YYYY" display text

## 4. Tests and verification

- [ ] 4.1 `cd backend && python3 -m pytest` passes
- [ ] 4.2 `DataCenterCard.test.jsx`: renders build date when present,
      omits it cleanly when absent (no regression on existing
      address-rendering test)
- [ ] 4.3 `cd frontend && npm test` passes
- [ ] 4.4 Manual: open a facility with a known build date and confirm it
      displays correctly in the detail panel next to the address; open one
      without and confirm no empty/broken line renders
