## Why

[[trackpolicy-datacenters]] pulls in facilities from trackpolicy.org,
which tracks real construction status per site — e.g. its visible list
already shows "Project Rainier" (New Carlisle, IN) and "Meta Prometheus"
(New Albany, OH) as under construction alongside others already
operational. Our schema has no field for this today. The existing
`data_status` field (`"confirmed"` / `"announced"`) looks like it might
cover this but doesn't — it's a *data-completeness* flag meaning "do we
have a real `power_mw` figure or not" (see `logic.py`'s
`data_status: dc.get("data_status", "confirmed" if power_mw else
"announced")` and its use in `isAnnounced`/`mapHelpers.js` to gray out
markers and exclude facilities from the compare view when their capacity
is unknown). A facility can be fully operational with a confirmed power
figure, or fully operational with an unannounced one — the two axes are
independent, and conflating them would make an operational facility with
unpublished capacity indistinguishable from a paper-stage announcement,
or vice versa.

Without a real lifecycle field, every facility we render implies "this
exists and is drawing power today," which becomes actively misleading
once trackpolicy.org-sourced planned/under-construction sites are mixed
in via [[trackpolicy-datacenters]] — their footprint (grid, water,
carbon impact) hasn't happened yet, but our impact math would present it
as though it had.

## What Changes

- Add a new `construction_status` field to the data schema, separate from
  `data_status`: `"operational" | "under_construction" | "planned"`.
  Default `"operational"` for all existing entries (matches reality today —
  nothing currently in the dataset is flagged otherwise) so this is
  additive and non-breaking.
- `fetch_data.py` / the [[trackpolicy-datacenters]] merge step sets
  `construction_status` from trackpolicy.org's status field where
  available; entries without a known status default to `"operational"`
  (the existing assumption) rather than guessing "planned."
- `logic.py`'s impact calculations (`compute_impact`) are only meaningful
  for facilities actually drawing power. For `"planned"` facilities (and
  optionally `"under_construction"`, pending the "what changes" question
  below), impact figures should be visually suppressed the same way
  `isAnnounced` already suppresses impact for capacity-unknown facilities
  — reusing that established UI pattern (`dc-announced-notice`-style
  banner) rather than inventing a new one.
- Map markers (`Map.jsx`, `mapHelpers.js`) get a third visual treatment
  for non-operational facilities — likely a distinct marker style (e.g.
  hollow/outlined vs. filled, alongside the existing `ANNOUNCED_COLOR`
  treatment) so a user scanning the map can tell "exists today" apart from
  "on paper." Reuses `markerColor`'s existing case-based structure.
- `DataCenterCard.jsx`'s detail panel shows the construction status
  plainly (e.g. a badge near `dc-detail-meta`, alongside operator/country)
  so it's not just a marker-color signal that's easy to miss.
- `CompareModal.jsx`'s facility picker: decide whether to exclude
  `"planned"` facilities the same way `"announced"`-capacity facilities
  are excluded today (comparing real impact against a facility with zero
  real-world footprint is likely as misleading as comparing against one
  with unknown capacity) — recommend excluding `"planned"`, including
  `"under_construction"` if it has a confirmed `power_mw`/design capacity,
  since a comparison there is at least directionally meaningful.

## Impact

- Affected code: `backend/data/datacenters.json` (new field, default
  `"operational"` on all current entries), `backend/fetch_data.py`
  (populate field on new entries), `backend/logic.py` (impact suppression
  for non-operational facilities), `frontend/src/components/Map.jsx` +
  `mapHelpers.js` (marker treatment), `frontend/src/components/
  DataCenterCard.jsx` (status badge + impact suppression), `frontend/src/
  components/CompareModal.jsx` (picker filtering).
- Depends on [[trackpolicy-datacenters]] for real status data on new
  entries, but is schema/UI work that stands on its own — existing
  entries all default to `"operational"` and render exactly as they do
  today, so this can land before or after that change without either
  blocking the other.
- Purely additive: no existing behavior changes for any entry that stays
  `"operational"` (i.e. everything in the dataset today, until
  trackpolicy.org data lands).
