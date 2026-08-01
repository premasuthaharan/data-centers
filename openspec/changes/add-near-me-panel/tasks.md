## 1. Backend: default IP

- [ ] 1.1 In `backend/main.py`, make the `ip` query param on `/api/locate`
      optional; when omitted, use `request.client.host` (checking
      `X-Forwarded-For` first, for deployments behind a proxy)
- [ ] 1.2 Add a test in `backend/tests/test_main.py` covering the
      omitted-`ip` case

## 2. Frontend: NearMePanel

- [ ] 2.1 Build `components/NearMePanel.jsx`: an opt-in trigger button, a
      loading/error state, and a ranked list of nearest facilities from
      `/api/datacenters/nearest?n=5`
- [ ] 2.2 Word each list item with community-impact framing (distance, name,
      grid price lift %, water severity) reusing existing `impact` fields
      and `formatters.js`
- [ ] 2.3 Add a "fly to" action per item that recenters `Map.jsx` on that
      facility (reuse whatever centering mechanism `Map.jsx` already
      exposes for marker selection)
- [ ] 2.4 Wire the panel into `App.jsx`'s `activePanel` state (or local
      open/close state if this ships before the scenario/compare panel
      state refactor)

## 3. Tests

- [ ] 3.1 `NearMePanel.test.jsx`: mocks `/api/locate` and
      `/api/datacenters/nearest`, verifies list renders and "fly to" fires
      the expected callback
- [ ] 3.2 `test_main.py`: default-IP `/api/locate` case (from step 1.2)

## 4. Verification

- [ ] 4.1 `cd backend && pytest` and `cd frontend && npm test` both pass
- [ ] 4.2 Manual: open the app, trigger "near me," confirm a plausible
      geolocation and a correctly distance-ranked list, and that "fly to"
      recenters the map on the right facility
