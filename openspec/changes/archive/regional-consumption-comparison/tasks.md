## 1. Backend: peer-facility ranking

- [x] 1.1 `logic.py`: add `peer_context` to a facility's computed impact —
      percentile rank among all facilities for `daily_withdrawal_mgd`,
      `annual_co2_tonnes`, and `annual_kwh`
- [x] 1.2 `logic.py`: add `extract_us_state(address, country)` helper that
      returns a US state code from `address`, or `None` when it can't be
      parsed. Implemented in `logic.py` rather than `fetch_data.py` since
      `fetch_data.py` is a standalone CLI script with network/CSV
      dependencies that shouldn't be imported into the API-serving module.
- [x] 1.3 `peer_context`: add rank-within-region — state for US
      facilities (via 1.2), country otherwise — e.g. "3rd of 8" — omitted
      when region can't be determined
- [x] 1.4 Backend tests: percentile/rank correctness against a small
      known dataset, and correct behavior when state parsing fails

## 2. Backend: state-level water stress

- [x] 2.1 `logic.py`: add `STATE_WATER_STRESS` table (US states →
      low/moderate/high/extremely high), hand-curated using WRI Aqueduct
      categories as informal guidance, matching the existing
      `IMPACT_RATES` sourcing pattern
- [x] 2.2 `SOURCES.md`: document `STATE_WATER_STRESS` provenance and
      caveats (categorical, not measured withdrawal), same section style
      as "Per-country water intensity"
- [x] 2.3 Attach `water_stress_category` to `impact.water.stress_category`
      when state is resolved and present in the table; omit cleanly
      otherwise
- [x] 2.4 Backend tests: correct category lookup, clean omission for
      non-US facilities and unparseable/untabled states

## 3. Backend: grid/carbon regional framing

- [x] 3.1 `logic.py`: add `grid_context` — facility's country rank and
      percentile among a `COUNTRY_RENEWABLE_PCT` table (mirrors
      `GRID_DATA`'s renewable_pct values; kept separate since `logic.py`
      must not import the CLI-only `fetch_data.py`)
- [x] 3.2 Backend tests: rank/percentile correctness, clean omission for
      untracked countries

## 4. Frontend

- [x] 4.1 `DataCenterCard.jsx`: Water block — add peer-ranking line from
      `peer_context`, conditionally rendered
- [x] 4.2 `DataCenterCard.jsx`: Water block — add state water-stress badge
      from `water_stress_category`, conditionally rendered, alongside
      (not replacing) existing severity/households-equivalent rows
- [x] 4.3 `DataCenterCard.jsx`: Carbon & Air block — add grid-ranking line
      from `grid_context`, conditionally rendered
- [x] 4.4 `DataCenterCard.test.jsx`: each of the three additions renders
      when its data is present and omits cleanly when absent

## 5. Verification

- [x] 5.1 `cd backend && python3 -m pytest` passes (154 passed, 100% logic.py coverage)
- [x] 5.2 `cd frontend && npm test` passes (120 passed)
- [x] 5.3 Manual: spot-checked peer rankings and grid rankings against raw
      `datacenters.json`/`GRID_DATA` computations directly in a Python
      shell for several facilities — matched expectations
- [x] 5.4 Manual: verified via Playwright screenshot (light + dark) that
      Colossus 2 (Memphis, TN) renders all three context lines cleanly
      with no overlap/clipping; confirmed in code that facilities with
      unresolvable state/untabled category (e.g. IL, non-US) omit just
      the missing line while the rest of the card renders normally
