## Why

15 of 43 entries in `datacenters.json` have `power_mw: 0.0` (mostly
newly-announced or under-construction sites, e.g. the OpenAI Stargate
projects, where Epoch AI has no published capacity figure yet). Because
every impact metric in `logic.py` derives from `power_mw`, these facilities
render as having **zero** electricity, water, carbon, and land impact —
indistinguishable in the UI from "we checked and it's negligible." That's
misleading: it's actually "we don't know yet."

## What Changes

- Add a `data_status` field to each data center record:
  `"confirmed"` (has real `power_mw`) or `"announced"` (power_mw is 0/null,
  i.e. not yet public).
- `compute_impact()` in `logic.py` returns this status alongside the metrics
  rather than silently computing zeroes.
- Frontend renders `"announced"` facilities distinctly (e.g. grayed
  marker, "capacity not yet public" label instead of "0 homes powered").

## Impact

- Affected code: `backend/fetch_data.py` (set status at generation time),
  `backend/logic.py` (`compute_impact`, `all_datacenters_with_impact`),
  `backend/data/datacenters.json` (new field),
  `frontend/src/components/DataCenterCard.jsx`,
  `frontend/src/components/Map.jsx`.
- Additive field — no breaking API changes.
