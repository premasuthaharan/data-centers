## Why

Tests exist for both backend (`pytest`, 71 tests) and frontend (`vitest`)
but nothing runs them automatically. A PR can merge with a failing test, or
with test coverage silently eroding over time, and no one would notice
until it broke in production or a future contributor stumbled onto it.
There is currently no `.github/workflows/` check that runs on pull
requests at all — `refresh-data.yml` (added by
[[automate-data-refresh]]) is the only existing workflow, and it's
schedule/dispatch-triggered, not PR-triggered.

## What Changes

- Add a GitHub Actions workflow that runs on every PR (and push to `main`)
  and:
  - Installs backend deps and runs `pytest` with coverage
    (`pytest-cov`), failing the job if any test fails.
  - Installs frontend deps and runs `vitest run` with coverage
    (`@vitest/coverage-v8`), failing the job if any test fails.
  - Enforces a minimum coverage threshold for each side (backend via
    `pytest-cov`'s `--cov-fail-under`, frontend via vitest's
    `coverage.thresholds`), failing the job if coverage drops below it.
- Add `pytest-cov` to `backend/requirements-dev.txt` and
  `@vitest/coverage-v8` to `frontend/package.json` devDependencies.
- Document the coverage gate and how to run coverage locally in
  `backend/README.md` / `frontend/README.md`.

## Impact

- Affected code: new `.github/workflows/ci.yml` (or similar),
  `backend/requirements-dev.txt`, `backend/pytest.ini` (or a new
  `.coveragerc`), `frontend/package.json`, `frontend/vitest.config.js`.
- No changes to application logic — this only adds a check that runs
  in CI.
- Current measured coverage (source files only, tests excluded):
  backend ~70% (`logic.py` 100%, `main.py` 78%, `fetch_data.py` 54% —
  dragged down by the largely-untested `main()` orchestration function,
  whose individual helpers are well covered). Frontend coverage has not
  yet been measured (no coverage provider installed). The initial
  threshold(s) should be set at or slightly below current measured
  coverage so the gate passes immediately on adoption, then can be
  ratcheted up over time — not set aspirationally above what the
  codebase already achieves, which would make the check fail on landing.
