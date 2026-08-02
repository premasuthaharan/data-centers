## Why

Journalists and advocacy groups are a natural audience for this data
(see the community-organizing framing in
[[add-community-impact-annotations]]), but today the only way to share
anything from this site is a full-app link (`facility=<id>` /
`scenario=...` share links from `facility-share-links` and
`scenario-share-links`). There's no way to (a) get the underlying data
out as a file for someone doing their own analysis or reporting, or (b)
cite/embed a single facility's numbers in an article or blog post without
sending readers to the full interactive map. Both are low-effort,
high-leverage additions for exactly the audience the community-impact
framing is aimed at.

## What Changes

- **CSV export**: a new "Export CSV" action in the main toolbar
  (`App.jsx`'s `app-action-btn` row, alongside the existing
  Scenario/Compare/Scorecard buttons) that downloads the currently
  visible facility set as CSV. Given the app currently has no real
  filter state beyond `focusedRegion` (from the region scorecard) and
  NearMePanel's radius search, "current filtered view" today effectively
  means either "all facilities" or "facilities in the focused region" —
  scope this change to those two cases rather than implying a general
  filter system that doesn't exist yet. Columns: the same fields already
  shown in the UI (name, operator, country, address, power, cost,
  computed impact figures) rather than the full raw dataset schema, so
  the export matches what a user actually sees.
- If a scenario is active, the export should reflect scenario-adjusted
  figures (not silently fall back to baseline), since exporting "what
  you're looking at" is the whole point — mirrors how `DataCenterCard`
  and `ScenarioPanel` already show scenario deltas.
- **Embeddable single-facility widget**: a new minimal route/view (e.g.
  `/embed/:facilityId`) that renders just one facility's stat card in a
  stripped-down, iframe-friendly layout — no toolbar, no map, no
  navigation chrome — suitable for embedding in an article. Reuses
  `DataCenterCard`'s existing stat-rendering logic rather than
  duplicating it, but without the close button, copy-link button, or
  detail-panel-wrapper animation that only make sense inside the full
  app.
- The embed view needs its own minimal data fetch (just
  `GET /api/datacenters` filtered client-side to one id, or a new
  `GET /api/datacenters/{id}` single-facility endpoint — the latter is
  cleaner and avoids shipping the full dataset to an embed) and should
  set permissive-enough headers/CSP for iframe embedding (current CORS
  config in `main.py` only governs API access, not iframe framing, so
  this needs its own consideration, e.g. not setting
  `X-Frame-Options: DENY` on that route).
- A "Copy embed code" button (on the full `DataCenterCard`, near the
  existing "Copy link" button) that copies an `<iframe src="...">` snippet
  pointing at the new embed route, so a user doesn't have to hand-construct
  the URL.

## Impact

- Affected code: `frontend/src/App.jsx` (new export button + CSV
  generation, reusing already-loaded `datacenters`/`scenarioData` state),
  new `frontend/src/routes/Embed.jsx` (or similar) + routing setup (the
  app doesn't currently appear to use a router beyond query-param state —
  introducing one, even a minimal one, for a single embed route is a
  real addition worth confirming is wanted rather than, e.g., a
  `?embed=1` query-param mode on the existing single-page app), possibly
  a new `GET /api/datacenters/{id}` backend endpoint,
  `DataCenterCard.jsx` (new "Copy embed code" button).
- Open question to resolve during implementation: embed-as-separate-route
  vs. embed-as-query-param-mode on the existing app shell. The
  query-param approach (`?embed=<id>` triggering a stripped-down render
  inside the same `App.jsx`) avoids adding routing infrastructure and is
  more consistent with how this app already handles `?facility=`/
  `?scenario=` — recommend that over a new router unless there's a
  reason embeds need a distinct URL structure.
- CSV export has no backend dependency (pure client-side from already-
  fetched data); the embed view is the larger piece of new surface area.
- Independent of the other three changes in this batch.
