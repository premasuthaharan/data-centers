## 1. Backend: peer-facility ranking

- [ ] 1.1 `logic.py`: add `peer_context` to a facility's computed impact —
      percentile rank among all facilities for `daily_withdrawal_mgd`,
      `annual_co2_tonnes`, and `annual_kwh`
- [ ] 1.2 Extend `fetch_data.py`'s address parsing to expose a
      `_extract_state` (or reuse `_simplify_address`) helper that returns
      a US state code from `address`, returning `None` when it can't be
      parsed
- [ ] 1.3 `peer_context`: add rank-within-region — state for US
      facilities (via 1.2), country otherwise — e.g. "3rd of 8" — omitted
      when region can't be determined
- [ ] 1.4 Backend tests: percentile/rank correctness against a small
      known dataset, and correct behavior when state parsing fails

## 2. Backend: state-level water stress

- [ ] 2.1 `logic.py`: add `STATE_WATER_STRESS` table (US states →
      low/moderate/high/extremely high), hand-curated using WRI Aqueduct
      categories as informal guidance, matching the existing
      `IMPACT_RATES` sourcing pattern
- [ ] 2.2 `SOURCES.md`: document `STATE_WATER_STRESS` provenance and
      caveats (categorical, not measured withdrawal), same section style
      as "Per-country water intensity"
- [ ] 2.3 Attach `water_stress_category` to a facility's `peer_context` (or
      a sibling field) when state is resolved and present in the table;
      omit cleanly otherwise
- [ ] 2.4 Backend tests: correct category lookup, clean omission for
      non-US facilities and unparseable/untabled states

## 3. Backend: grid/carbon regional framing

- [ ] 3.1 `logic.py`: add `grid_context` — facility's country rank and
      percentile among all `GRID_DATA` countries by `renewable_pct`
- [ ] 3.2 Backend tests: rank/percentile correctness, clean omission for
      countries not in `GRID_DATA`

## 4. Frontend

- [ ] 4.1 `DataCenterCard.jsx`: Water block — add peer-ranking line from
      `peer_context`, conditionally rendered
- [ ] 4.2 `DataCenterCard.jsx`: Water block — add state water-stress badge
      from `water_stress_category`, conditionally rendered, alongside
      (not replacing) existing severity/households-equivalent rows
- [ ] 4.3 `DataCenterCard.jsx`: Carbon & Air block — add grid-ranking line
      from `grid_context`, conditionally rendered
- [ ] 4.4 `DataCenterCard.test.jsx`: each of the three additions renders
      when its data is present and omits cleanly when absent

## 5. Verification

- [ ] 5.1 `cd backend && python3 -m pytest` passes
- [ ] 5.2 `cd frontend && npm test` passes
- [ ] 5.3 Manual: spot-check peer rankings and grid rankings against raw
      `datacenters.json`/`GRID_DATA` for a handful of facilities
- [ ] 5.4 Manual: confirm facilities missing state/country context (e.g.
      non-US, untabled state) render the rest of the card normally with
      no broken section
