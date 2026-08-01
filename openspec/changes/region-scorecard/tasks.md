## 1. Backend: /api/regions

- [ ] 1.1 Add a region-grouping helper (in `backend/logic.py` or inline in
      `backend/main.py`) that buckets facilities by `country` and calls
      `aggregate_impact()` per bucket
- [ ] 1.2 Add `GET /api/regions` to `backend/main.py` returning, per
      region: region name, facility count, and the `aggregate_impact()`
      totals for that region
- [ ] 1.3 Add `backend/tests/test_main.py` coverage for the new endpoint

## 2. Frontend: RegionScorecard

- [ ] 2.1 Build `components/RegionScorecard.jsx`: fetches `/api/regions`,
      renders regions ranked by a selectable metric (default: total CO2),
      with a metric-switcher control
- [ ] 2.2 Add a "focus this region" action per entry that filters/flies
      the map to that region's facilities, reusing `Map.jsx`'s existing
      centering mechanism
- [ ] 2.3 Wire an entry point into `App.jsx` to open the scorecard

## 3. Tests

- [ ] 3.1 `RegionScorecard.test.jsx`: renders ranked regions from a mocked
      `/api/regions` response; switching metric re-sorts the list;
      "focus this region" fires the expected callback
- [ ] 3.2 Backend: verify `/api/regions` totals match manually-summed
      per-facility impact for a small fixture set

## 4. Verification

- [ ] 4.1 `cd backend && pytest` and `cd frontend && npm test` both pass
- [ ] 4.2 Manual: open the scorecard, confirm regions are ranked
      sensibly, switch the ranking metric, and confirm "focus this region"
      correctly centers/filters the map
