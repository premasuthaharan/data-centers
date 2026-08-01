## Why

`backend/data/datacenters.json` is a single point-in-time file: every run
of `fetch_data.py` (manual today, or scheduled per the archived
`automate-data-refresh` change) overwrites it in place. There is currently
no record of what the dataset looked like at any previous point in time.
For a tool tracking facilities that are actively being built and
announced, "how has this changed over the last N months" (new capacity
added, `data_status` moving from planned to confirmed, footprint growth)
is an obviously valuable future view — but it's impossible to build
without historical data existing first. This change is scoped narrowly to
just capturing that history; no trend UI or history-serving endpoint is
included here, since there isn't enough real snapshot data yet to make one
meaningful.

## What Changes

- Each time `fetch_data.py` runs, in addition to writing/overwriting
  `backend/data/datacenters.json`, also write a dated, immutable snapshot
  to `backend/data/snapshots/YYYY-MM-DD.json` (same shape as
  `datacenters.json`, including its existing `generated_at` field).
- Add a small retention step (in `fetch_data.py` or a new
  `backend/snapshot_utils.py`) so the snapshot directory doesn't grow
  unbounded — keep every snapshot for now given the low expected run
  frequency (monthly, per `automate-data-refresh`), but structure the
  retention logic as its own function so a future policy change (e.g.
  "keep monthly for a year, then quarterly") is a small, isolated edit.
- Explicitly out of scope: no new API endpoint to serve historical data,
  no frontend trend chart, no diffing between snapshots. This change only
  produces the raw data files; visualizing them is deferred to a later
  change once a meaningful number of snapshots have accumulated.

## Impact

- Affected code: `backend/fetch_data.py` (write snapshot alongside the
  main file), new `backend/snapshot_utils.py` (retention helper), new
  `backend/data/snapshots/` directory (gitignored or committed — decide
  during implementation based on repo size preferences), `backend/tests/`
  coverage for snapshot writing and retention.
- Complements but does not modify [[automate-data-refresh]] (the scheduled
  job that invokes `fetch_data.py`) — this change only changes what that
  script writes to disk on each run.
- No backend API or frontend changes in this proposal.
