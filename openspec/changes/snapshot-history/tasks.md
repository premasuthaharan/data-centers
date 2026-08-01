## 1. Snapshot writing

- [ ] 1.1 In `fetch_data.py`, after writing `backend/data/datacenters.json`,
      also write an identical copy to
      `backend/data/snapshots/<generated_at date>.json` (create the
      `snapshots/` directory if absent)
- [ ] 1.2 If a snapshot for the same date already exists (e.g. script run
      twice in a day), overwrite it rather than erroring or duplicating

## 2. Retention

- [ ] 2.1 Add `backend/snapshot_utils.py` with a `prune_snapshots(dir,
      policy)`-style function, even if the initial policy is "keep
      everything" — isolate the decision point for later tightening
- [ ] 2.2 Call the retention step at the end of `fetch_data.py`'s run

## 3. Tests

- [ ] 3.1 `test_fetch_data.py` (new or extended): running the fetch
      pipeline writes both `datacenters.json` and a dated snapshot with
      matching content
- [ ] 3.2 `test_snapshot_utils.py`: retention function behaves correctly
      given a directory of fake dated snapshot files

## 4. Verification

- [ ] 4.1 `cd backend && pytest` passes
- [ ] 4.2 Manual: run `python3 fetch_data.py` locally, confirm a new dated
      file appears under `backend/data/snapshots/` with the same
      `generated_at`/`data_centers` content as `datacenters.json`
- [ ] 4.3 Confirm re-running on the same day overwrites that day's
      snapshot rather than creating a duplicate or crashing
