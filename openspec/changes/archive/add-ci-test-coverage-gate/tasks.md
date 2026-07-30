## 1. Backend coverage tooling
- [x] 1.1 Add `pytest-cov` to `backend/requirements-dev.txt`
- [x] 1.2 Configure coverage source/omit rules (e.g. exclude `tests/`
      itself) in `backend/pytest.ini` or a new `backend/.coveragerc` —
      used `backend/.coveragerc` (`omit = tests/*`) since `pytest-cov`
      reads `.coveragerc` by default, not `pytest.ini`'s `[coverage:*]`
      sections
- [x] 1.3 Decide the backend coverage threshold and how it's measured
      (e.g. overall `--cov-fail-under=X`, or per-module) — set at or
      slightly below current measured coverage (~70% source-only) so it
      passes on landing, not aspirationally above it — used
      `--cov-fail-under=69` (measured: exactly 70% source-only), wired
      via `pytest.ini`'s `addopts` so bare `pytest` enforces it

## 2. Frontend coverage tooling
- [x] 2.1 Add `@vitest/coverage-v8` to `frontend/package.json`
      devDependencies
- [x] 2.2 Configure `coverage` options (provider, reporters, `thresholds`)
      in `frontend/vitest.config.js`
- [x] 2.3 Measure current frontend coverage and set the initial
      threshold at or slightly below it, same rationale as 1.3 — measured
      ~13% statements across all of `src/` (`all: true`, not just files
      touched by existing tests — most components have no
      component-level tests yet, only extracted pure-helper files do);
      set thresholds to 10%

## 3. CI workflow
- [x] 3.1 Add a GitHub Actions workflow (e.g. `.github/workflows/ci.yml`)
      triggered on `pull_request` and `push` to `main`
- [x] 3.2 Backend job: install deps from `requirements.txt` +
      `requirements-dev.txt`, run `pytest --cov` with the threshold from
      1.3, fail the job on any test failure or under-threshold coverage
      — bare `pytest` (threshold comes from `pytest.ini`'s `addopts`)
- [x] 3.3 Frontend job: install deps (`npm ci`), run `vitest run
      --coverage`, fail the job on any test failure or under-threshold
      coverage — via the new `npm run test:coverage` script
- [ ] 3.4 Confirm the workflow is required for merge (branch protection
      rule on `main`) if repo settings allow configuring that — otherwise
      note it as a manual follow-up — **not done from this environment**:
      requires a GitHub repo settings change (Settings → Branches →
      branch protection rule requiring the `backend` / `frontend` status
      checks), left as a follow-up for whoever has admin access to the
      repo after this merges

## 4. Documentation
- [x] 4.1 Document how to run coverage locally in `backend/README.md`
- [x] 4.2 Document how to run coverage locally in `frontend/README.md`

## 5. Verification
- [x] 5.1 Confirm the workflow passes on a clean run of `main` — approximated
      by running the exact commands the workflow runs (`pytest` in
      `backend/`, `npm run test:coverage` in `frontend/`) locally against
      a clean working tree; both exit 0. A real run of `ci.yml` on
      GitHub's infra can only happen once this branch/PR exists there.
- [x] 5.2 Confirm the workflow fails when a test is deliberately broken
      (manual smoke test, reverted before merge) — broke
      `test_same_point_is_zero`'s assertion, confirmed `pytest` exits 1,
      reverted via `git checkout`
- [x] 5.3 Confirm the workflow fails when coverage is deliberately
      dropped below the threshold (manual smoke test, reverted before
      merge) — temporarily raised `--cov-fail-under` to 95 (backend) and
      all four thresholds to 90 (frontend), confirmed both exit 1 with
      clear "coverage not reached" errors despite all tests passing,
      reverted both via `git checkout`
