## 1. Backend coverage tooling
- [ ] 1.1 Add `pytest-cov` to `backend/requirements-dev.txt`
- [ ] 1.2 Configure coverage source/omit rules (e.g. exclude `tests/`
      itself) in `backend/pytest.ini` or a new `backend/.coveragerc`
- [ ] 1.3 Decide the backend coverage threshold and how it's measured
      (e.g. overall `--cov-fail-under=X`, or per-module) — set at or
      slightly below current measured coverage (~70% source-only) so it
      passes on landing, not aspirationally above it

## 2. Frontend coverage tooling
- [ ] 2.1 Add `@vitest/coverage-v8` to `frontend/package.json`
      devDependencies
- [ ] 2.2 Configure `coverage` options (provider, reporters, `thresholds`)
      in `frontend/vitest.config.js`
- [ ] 2.3 Measure current frontend coverage and set the initial
      threshold at or slightly below it, same rationale as 1.3

## 3. CI workflow
- [ ] 3.1 Add a GitHub Actions workflow (e.g. `.github/workflows/ci.yml`)
      triggered on `pull_request` and `push` to `main`
- [ ] 3.2 Backend job: install deps from `requirements.txt` +
      `requirements-dev.txt`, run `pytest --cov` with the threshold from
      1.3, fail the job on any test failure or under-threshold coverage
- [ ] 3.3 Frontend job: install deps (`npm ci`), run `vitest run
      --coverage`, fail the job on any test failure or under-threshold
      coverage
- [ ] 3.4 Confirm the workflow is required for merge (branch protection
      rule on `main`) if repo settings allow configuring that — otherwise
      note it as a manual follow-up

## 4. Documentation
- [ ] 4.1 Document how to run coverage locally in `backend/README.md`
- [ ] 4.2 Document how to run coverage locally in `frontend/README.md`

## 5. Verification
- [ ] 5.1 Confirm the workflow passes on a clean run of `main`
- [ ] 5.2 Confirm the workflow fails when a test is deliberately broken
      (manual smoke test, reverted before merge)
- [ ] 5.3 Confirm the workflow fails when coverage is deliberately
      dropped below the threshold (manual smoke test, reverted before
      merge)
