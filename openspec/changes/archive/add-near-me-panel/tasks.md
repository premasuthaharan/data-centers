## 1. Backend: default IP

- [x] 1.1 In `backend/main.py`, make the `ip` query param on `/api/locate`
      optional; when omitted, use `request.client.host` (checking
      `X-Forwarded-For` first, for deployments behind a proxy)
- [x] 1.2 Add a test in `backend/tests/test_main.py` covering the
      omitted-`ip` case

## 2. Frontend: NearMePanel

- [x] 2.1 Build `components/NearMePanel.jsx`: an opt-in trigger button, a
      loading/error state, and a ranked list of nearest facilities from
      `/api/datacenters/nearest?n=5`
- [x] 2.2 Word each list item with community-impact framing (distance, name,
      grid price lift %, water severity) reusing existing `impact` fields
      and `formatters.js`
- [x] 2.3 Add a "fly to" action per item that recenters `Map.jsx` on that
      facility (reuse whatever centering mechanism `Map.jsx` already
      exposes for marker selection)
      (wired directly to `App.jsx`'s existing `handleSelect`/`selectedId`
      state — no separate `activePanel` state needed since the
      scenario/compare refactor hasn't landed yet)
- [x] 2.4 Wire the panel into `App.jsx`
      (used local open/close state inside `NearMePanel` itself since this
      shipped before the `activePanel` state refactor in
      [[add-scenario-compare-ui]])

## 3. Tests

- [x] 3.1 `NearMePanel.test.jsx`: mocks `/api/locate` and
      `/api/datacenters/nearest`, verifies list renders and "fly to" fires
      the expected callback
- [x] 3.2 `test_main.py`: default-IP `/api/locate` case (from step 1.2)
      (added both a plain-request-IP case and an `X-Forwarded-For` case)

## 4. Verification

- [x] 4.1 `cd backend && pytest` and `cd frontend && npm test` both pass
      (72 backend tests, 25 frontend tests)
- [x] 4.2 Manual: open the app, trigger "near me," confirm a plausible
      geolocation and a correctly distance-ranked list, and that "fly to"
      recenters the map on the right facility
      (verified via headless Chromium: real loopback IP correctly triggers
      the error state with "Try again" since ip-api.com can't geolocate
      127.0.0.1; with `/api/locate` mocked to a real public-IP response,
      confirmed the ranked list renders with correct distance/price-lift/
      water-severity, and clicking a result flies the map to and opens the
      detail card for the matching facility)
