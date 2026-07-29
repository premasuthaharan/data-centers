## 1. Local command
- [ ] 1.1 Add a `Makefile` (or `package.json` script) target
      `refresh-data` that runs `fetch_data.py` with the right working
      directory/venv assumptions
- [ ] 1.2 Document the command in `backend/README.md`

## 2. Scheduled automation
- [ ] 2.1 Add a GitHub Actions workflow that runs monthly (cron) and
      executes the refresh script
- [ ] 2.2 Workflow opens a PR with the resulting diff to
      `datacenters.json` rather than pushing directly to main, so data
      changes get reviewed
- [ ] 2.3 Handle failures gracefully (e.g. Epoch AI CSV unreachable,
      Nominatim rate-limited) — fail the workflow loudly rather than
      committing partial/bad data

## 3. Verification
- [ ] 3.1 Manually trigger the workflow once and confirm it produces a
      sane PR
- [ ] 3.2 Confirm `generated_at` (from [[add-dataset-freshness-timestamp]])
      updates correctly on each scheduled run
