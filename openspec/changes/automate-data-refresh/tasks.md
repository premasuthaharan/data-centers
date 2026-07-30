## 1. Local command
- [x] 1.1 Add a `Makefile` (or `package.json` script) target
      `refresh-data` that runs `fetch_data.py` with the right working
      directory/venv assumptions — root-level `Makefile`, `cd backend &&
      python3 fetch_data.py`
- [x] 1.2 Document the command in `backend/README.md`

## 2. Scheduled automation
- [x] 2.1 Add a GitHub Actions workflow that runs monthly (cron) and
      executes the refresh script — `.github/workflows/refresh-data.yml`,
      `0 6 1 * *` plus `workflow_dispatch` for manual runs
- [x] 2.2 Workflow opens a PR with the resulting diff to
      `datacenters.json` rather than pushing directly to main, so data
      changes get reviewed — via `peter-evans/create-pull-request`,
      scoped to `backend/data/datacenters.json`
- [x] 2.3 Handle failures gracefully (e.g. Epoch AI CSV unreachable,
      Nominatim rate-limited) — fail the workflow loudly rather than
      committing partial/bad data — `fetch_data.py`'s
      `check_geocode_failure_rate()` raises before the file write if
      >20% of entries fail to geocode or zero entries were parsed, which
      fails the `make refresh-data` step (and thus the job) before the
      PR-creation step ever runs

## 3. Verification
- [ ] 3.1 Manually trigger the workflow once and confirm it produces a
      sane PR — **not done from this environment**: requires this branch
      to be merged (or the workflow file present on a branch GitHub will
      run `workflow_dispatch` from) and triggering via the GitHub UI/CLI
      after merge. Left unchecked as a follow-up for whoever merges this.
- [x] 3.2 Confirm `generated_at` (from [[add-dataset-freshness-timestamp]])
      updates correctly on each scheduled run — already covered by
      existing `fetch_data.py` behavior (`generated_at:
      datetime.now(timezone.utc).isoformat()` on every `main()` run,
      unconditionally) and existing `TestLoadDatacenters` coverage in
      `tests/test_logic.py`; no new code needed since this was already
      correct from the freshness-timestamp change
