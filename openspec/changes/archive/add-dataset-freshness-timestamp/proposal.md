## Why

Nothing in the repo records when the dataset was last generated. The only
trace is `fetch_log.txt`, a raw console-output dump with no date in its
content, and file mtimes aren't a durable signal once the repo is cloned or
re-committed. Users of the tool have no way to know if the data is a day old
or a year old — which matters a lot for a tool whose entire premise is
tracking real-world facilities that are actively being built out.

## What Changes

- `fetch_data.py` writes a top-level `generated_at` (ISO 8601 UTC
  timestamp) into `datacenters.json` (as metadata, not per-entry).
- Backend's `/api/datacenters` response includes this timestamp.
- Frontend displays "Data as of {date}" somewhere visible (e.g. header or
  footer).

## Impact

- Affected code: `backend/fetch_data.py`, `backend/data/datacenters.json`
  (structure changes slightly — see tasks), `backend/main.py` or
  `backend/logic.py` (expose the timestamp), `frontend/src/App.jsx`.
- Minor breaking change: `datacenters.json`'s top-level shape changes from a
  bare array to an object like `{"generated_at": ..., "data_centers": [...]}`
  — `load_datacenters()` and any consumer of the raw file must be updated
  together.
