## Why

[[scenario-share-links]] lets a user share a link that re-applies a policy
scenario (`?scenario=<presetId>` or `?scenario=custom&...`). Separately,
[[add-scenario-facility-detail]] lets a user, while a scenario is active,
click into an individual facility and see its baseline → scenario deltas
(CO2, water, etc.) rather than just the aggregate totals. Neither change
talks to the other: a scenario share-link only restores `scenarioData` and
opens the scenario panel — it has no way to also reopen the specific
facility's detail card the sender had open, so "look at what Grid
Decarbonization does to Google Arcola specifically" can't be shared as a
single link today. The recipient would land on the aggregate scenario view
and have to re-find and re-click the same facility themselves, losing the
most concrete, persuasive part of what the sender wanted to show.

## What Changes

- `ScenarioPanel.jsx`'s "copy link" button already encodes the active
  scenario via `encodeScenarioParams`; when a facility is also selected
  (`selectedId` in `App.jsx`), the copied URL additionally carries
  `?facility=<id>`, reusing the existing facility-link query param
  unchanged (from [[facility-share-links]]) rather than inventing a new
  scenario-scoped one. The two params combine naturally since they're
  independent `URLSearchParams` entries:
  `?scenario=grid-decarbonization&facility=google-arcola`.
- `App.jsx`: on mount, after both the shared scenario (if any) has been
  re-applied via `POST /api/scenario` and the datacenters list has loaded,
  resolve `?facility=<id>` the same way the existing facility-link flow
  does — but set `activePanel: 'detail'` (not `'scenario'`) when a facility
  id is present, so the recipient lands directly on the facility's detail
  card with scenario deltas already visible, rather than the aggregate
  scenario panel. `?scenario=` with no `?facility=` keeps today's behavior
  (opens the scenario panel).
- `DataCenterCard.jsx`'s "copy link" button (existing, facility-only) gains
  no new behavior on its own — but when a scenario is active, the
  `scenarioDc`/`scenarioLabel` props it already receives mean the card the
  user is looking at is scenario-aware, so its existing copy-link should
  also carry `?scenario=...` if one is active, for the same reason the
  scenario panel's copy-link now carries `?facility=...`: the link should
  reproduce the *exact* view on screen, not just the piece owned by the
  panel the button happens to live in.
- No backend changes — both params decode/re-apply using existing
  `GET /api/datacenters` and `POST /api/scenario` calls.

## Impact

- Affected code: `frontend/src/App.jsx` (mount-time decode ordering,
  `activePanel` resolution when both params are present),
  `frontend/src/components/ScenarioPanel.jsx` (copy-link includes
  `facility` when one is selected), `frontend/src/components/
  DataCenterCard.jsx` (copy-link includes `scenario` when one is active),
  plus their existing tests.
- Depends on [[scenario-share-links]] and [[add-scenario-facility-detail]]
  both shipping first — this change wires the two together and does
  nothing meaningful until both exist.
- Mount-time ordering matters and is new complexity this change owns: the
  facility-id lookup must wait for `datacenters` to load (existing
  behavior) AND, when a scenario param is also present, for
  `POST /api/scenario` to resolve (so `scenarioDc` can be computed
  immediately rather than the card first rendering baseline-only and then
  flashing to scenario values once the fetch completes).
- Purely additive: a link with only `?facility=` or only `?scenario=`
  behaves exactly as it does today; this only changes behavior when both
  are present together.
