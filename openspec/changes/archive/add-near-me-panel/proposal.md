## Why

`backend/main.py` already has `GET /api/locate?ip=` (IP geolocation) and
`GET /api/datacenters/nearest?lat=&lng=&n=` (nearest facilities by
distance), but nothing in the frontend calls either — confirmed there is no
`fetch` referencing `/api/locate` or `/api/datacenters/nearest` anywhere in
`frontend/src`. This is already-built, already-tested backend surface area
that directly supports the "impact on the surrounding area" framing the
project is meant to showcase: showing a user the facilities nearest to them
and what that means for their community (grid strain, water competition),
not just an abstract global map.

## What Changes

- Add `components/NearMePanel.jsx`: an opt-in panel (user clicks "show
  facilities near me" — no auto-geolocation on load, for privacy) that calls
  `/api/locate` then `/api/datacenters/nearest?n=5`, and renders a ranked
  list (distance, name, key impact stats framed as community effects: grid
  price lift, water severity) with a "fly to" action per result that
  recenters `Map.jsx` on that facility.
- Small backend follow-up in `backend/main.py`: `geolocate_ip` currently
  requires an explicit `ip` query param. Default it to the request's own
  origin IP (`request.client.host`, falling back to `X-Forwarded-For` if
  present) when `ip` is omitted, so the frontend doesn't need a separate
  "what's my IP" lookup.
- No new impact metrics — reuses the existing `impact` shape already
  returned by `nearest_datacenters()`.

## Impact

- Affected code: `backend/main.py` (`/api/locate` default-IP behavior),
  `frontend/src/App.jsx` (mount point + "fly to" wiring into `Map.jsx`), new
  `frontend/src/components/NearMePanel.jsx`, new
  `frontend/src/components/__tests__/NearMePanel.test.jsx`,
  `backend/tests/test_main.py` (default-IP case).
- Independent of [[add-scenario-aggregate-backend]] and
  [[add-scenario-compare-ui]] — can ship first or in parallel since it only
  uses existing endpoints.
- Sets up (but does not implement) a possible future per-region "scorecard"
  page, deferred until after this panel ships.
