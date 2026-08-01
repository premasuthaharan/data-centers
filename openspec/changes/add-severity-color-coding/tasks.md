## 1. Define thresholds

- [x] 1.1 Analyze the real distribution of `price_lift_pct` and
      `renewable_pct` across the current 75-facility dataset to set
      sensible, non-arbitrary threshold cutoffs (not just the illustrative
      numbers in the proposal) — e.g. via a quick script over
      `backend/data/datacenters.json`
- [x] 1.2 Document the chosen thresholds and their rationale in
      `backend/SOURCES.md`, alongside the existing water-severity
      threshold documentation, so future contributors have one place to
      look for all severity-scale definitions

## 2. Backend severity fields

- [x] 2.1 In `compute_impact()` (`backend/logic.py`), add
      `price_lift_severity` to the `electricity` block and
      `renewable_severity` to the `carbon` block, using the thresholds
      from step 1
- [x] 2.2 Update `aggregate_impact()` if it should also report
      `price_lift_severity_counts`/`renewable_severity_counts` alongside
      the existing `water_severity_counts` (decide based on whether this
      is actually useful for the scenario-totals UI, not just for
      symmetry) — **decided: skip.** `water_severity_counts` exists only
      to power `RegionScorecard.jsx`'s dominant-severity badge; no UI in
      this change's scope (`NearMePanel.jsx`/`DataCenterCard.jsx` only,
      per the proposal's Impact section) consumes aggregate severity
      counts for price lift or renewables. Adding them now would be
      speculative surface area with no caller — can be added later if a
      scorecard-style view for these metrics is actually proposed.

## 3. Shared frontend color helper

- [ ] 3.1 Create a shared severity-color module (e.g.
      `frontend/src/components/severityColors.js`) exporting the
      low/moderate/high/critical color palette, replacing the two
      independently-duplicated `WATER_COLORS` constants in
      `NearMePanel.jsx` and `DataCenterCard.jsx`
- [ ] 3.2 Add a lookup for the renewable-% inverted scale if it needs a
      different mapping direction than the shared palette assumes (higher
      value = better vs. higher value = worse)

## 4. Apply in components

- [ ] 4.1 `NearMePanel.jsx`: color-code "Grid price lift" using
      `price_lift_severity`, matching the existing water-severity styling
      pattern (colored value, not colored label)
- [ ] 4.2 `NearMePanel.jsx`: decide whether "Grid renewables %" should be
      added to the ranked-list stats at all (it currently isn't shown
      there) — if added, color-code it; if not, note why in the PR
- [ ] 4.3 `DataCenterCard.jsx`: replace the hardcoded
      `accent="#f59e0b"` on the price-lift `StatRow` with the new
      `price_lift_severity`-driven color
- [ ] 4.4 `DataCenterCard.jsx`: color-code "Grid renewables" using
      `renewable_severity`, consistent with how water severity is already
      applied to its `ImpactBlock`/`StatRow`

## 5. Tests

- [ ] 5.1 `test_logic.py`: `price_lift_severity` and `renewable_severity`
      thresholds and boundaries (mirroring the existing
      `test_water_severity_thresholds`/`test_water_severity_boundary_*`
      test patterns)
- [ ] 5.2 Frontend: update `NearMePanel.test.jsx` and any
      `DataCenterCard` tests to assert on the new colored fields
- [ ] 5.3 Confirm the shared color helper is unit-testable independent of
      either component (mirrors how `mapHelpers.js`'s `waterSeverityColor`
      is already tested standalone)

## 6. Verification

- [ ] 6.1 `cd backend && pytest` and `cd frontend && npm test` both pass
- [ ] 6.2 Manual: open "Show data centers near me" and a facility detail
      card, confirm grid price lift (and renewables, if added) now render
      with severity-appropriate colors consistent with water's existing
      treatment, and that cars/homes/households-equivalent numbers
      intentionally remain uncolored
