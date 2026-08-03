## 1. CSV export

- [x] 1.1 `App.jsx`: add "Export CSV" to the `app-action-btn` toolbar
- [x] 1.2 Build CSV generation from already-loaded `datacenters` state,
      scoped to all facilities or the `focusedRegion` subset if one is
      active
- [x] 1.3 When `scenarioData` is active, export scenario-adjusted impact
      figures rather than baseline
- [x] 1.4 Trigger a client-side download (Blob + anchor click, no backend
      round-trip needed)
- [x] 1.5 Frontend tests: CSV content matches visible facility set and
      reflects active scenario/region-focus state correctly

## 2. Single-facility endpoint (for the embed view)

- [ ] 2.1 `GET /api/datacenters/{id}` in `main.py`, returning one
      facility with computed impact (reuses existing `compute_impact`
      logic rather than shipping the full dataset to an embed)
- [ ] 2.2 Backend tests: valid id returns the facility, unknown id
      returns 404

## 3. Embed view

- [ ] 3.1 Decide embed mechanism: `?embed=<id>` mode on the existing
      `App.jsx` shell (recommended, consistent with existing
      `?facility=`/`?scenario=` handling) vs. a new route — confirm
      before building
- [ ] 3.2 Stripped-down render: `DataCenterCard`'s stat display reused,
      with close button, copy-link button, and detail-panel-wrapper
      animation omitted for the embed context
- [ ] 3.3 Confirm/adjust response headers so the embed view can be framed
      (no `X-Frame-Options: DENY` on that path)
- [ ] 3.4 Frontend tests for the embed render path

## 4. Copy embed code

- [ ] 4.1 `DataCenterCard.jsx`: new "Copy embed code" button near the
      existing "Copy link" button, copying an `<iframe src="...">` snippet
      for the facility
- [ ] 4.2 Frontend test: embed code copy produces the correct iframe
      snippet for a given facility id

## 5. Verification

- [ ] 5.1 `cd backend && python3 -m pytest` passes
- [ ] 5.2 `cd frontend && npm test` passes
- [ ] 5.3 Manual: export CSV with and without an active scenario/region
      focus, confirm contents match what's on screen
- [ ] 5.4 Manual: copy embed code, paste the iframe snippet into a plain
      HTML file, confirm it renders correctly framed
