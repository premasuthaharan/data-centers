## Why

`fetch_data.py` is explicitly a "run once" manual script per its own
docstring. The running app never calls it, there's no cron/scheduled job,
and the dataset is frozen at whatever the last manual run produced (43
entries, per `fetch_log.txt`). For a tool whose value proposition is
tracking real-world facilities that are actively being built and announced,
a dataset that never refreshes without a human remembering to run a script
will silently go stale.

## What Changes

- Add a `make refresh-data` (or equivalent npm/CLI) command that wraps
  `fetch_data.py` so refreshing is a single documented command instead of
  "remember to run this Python file directly."
- Add a scheduled job (e.g. GitHub Actions cron) that runs the refresh
  monthly and opens a PR with the diff to `datacenters.json`, rather than
  auto-committing directly to main.
- Depends on [[add-dataset-freshness-timestamp]] so each refresh is
  self-documenting.

## Impact

- Affected code: new `Makefile` target or script wrapper, new
  `.github/workflows/refresh-data.yml`.
- No changes to `logic.py` or the API — this is purely about the data
  generation pipeline's operational cadence.
