## Why

`selectedId` in `App.jsx` is client-only React state — there's currently no
way to link someone directly to a specific facility's detail card (e.g.
"look at this one, near you"). Every other entry point (map click, near-me
panel "fly to") lands on the same state but none of it is reachable from
outside the running app.

## What Changes

- Sync `selectedId` to a `?facility=<id>` URL query param via
  `URLSearchParams` + `history.pushState` — no routing library introduced,
  consistent with the app's current architecture and the same pattern used
  in [[scenario-share-links]].
- `App.jsx`: on mount, read `?facility=` from the URL; if it matches a
  loaded facility ID, select it and fly the map to it (reusing whatever
  centering mechanism `Map.jsx` already exposes for `NearMePanel`'s "fly
  to" and marker-click selection — no new centering logic).
- Update the URL (without reload) whenever `handleSelect`/`handleClose`
  changes `selectedId`, so the address bar always reflects the open
  card and the URL is shareable at any point.
- `DataCenterCard.jsx`: add a "copy link" action alongside the existing
  card content that copies the current facility's shareable URL.

## Impact

- Affected code: `frontend/src/App.jsx` (URL sync on mount + on selection
  change), `frontend/src/components/DataCenterCard.jsx` (copy-link
  button), tests for both.
- Independent of [[scenario-share-links]] and doesn't require
  [[add-scenario-aggregate-backend]] or [[add-scenario-compare-ui]] — can
  ship any time, since it only touches the existing `selectedId`/detail-card
  flow. May share a small `urlState.js` helper with
  [[scenario-share-links]] if that change lands first; not a hard
  dependency either way.
- No backend changes.
