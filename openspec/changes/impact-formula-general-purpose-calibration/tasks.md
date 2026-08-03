## 1. Derive new constants from real data

- [x] 1.1 Compute the actual `power_mw` distribution (min/p25/median/p75/max)
      separately for `category: "frontier-ai"` and `category:
      "general-purpose"` facilities in the current 318-entry dataset —
      the same methodology `SOURCES.md` already used for the original
      75-facility threshold derivation
- [x] 1.2 Decide per-category `PUE` and `UTILIZATION_FACTOR` values:
      frontier-ai stays close to today's 1.3 / 0.8 (optimistic, modern,
      near-continuous load); general-purpose moves toward the Uptime
      Institute 2024 survey average (1.56 PUE) and a lower utilization
      figure representative of non-AI-training workloads. Document the
      reasoning and source for each, matching the existing `SOURCES.md`
      standard (not just picking new numbers)
- [x] 1.3 Recompute `price_lift_pct` and `water_mgd` for every current
      entry under the existing formula and inspect the resulting
      distribution to re-derive `price_lift_severity` /
      `water_severity` bucket boundaries — decide single global
      thresholds vs. category-aware thresholds based on whether a single
      re-tuned set still produces a usably-spread distribution (see open
      question in proposal.md)

## 2. Implement in logic.py

- [x] 2.1 Replace the single global `PUE` / `UTILIZATION_FACTOR`
      constants with per-category values (dict keyed by `category`,
      falling back to today's global constants if `category` is absent
      from a record)
- [x] 2.2 `compute_impact` reads the category-appropriate PUE/utilization
      for `annual_kwh` and `waste_heat_mw` instead of the flat
      module-level constants
- [x] 2.3 Update `price_lift_severity` / `water_severity` threshold
      constants per the decision in 1.3
- [x] 2.4 Confirm `pue`/`utilization` override parameters on
      `compute_impact` (used by the policy-scenario feature) still work
      correctly layered on top of category-based defaults — an explicit
      scenario override should still win over the category default

## 3. Documentation

- [ ] 3.1 Update `SOURCES.md`'s "Utilization factor" and "PUE" sections
      with the new per-category values, derivation, and citations
- [ ] 3.2 Update `SOURCES.md`'s "Grid price lift severity thresholds" and
      "Water severity thresholds" sections with the new boundaries and
      the full-318-entry distribution they were tuned against

## 4. Tests and verification

- [ ] 4.1 `backend/tests/test_logic.py`: update/add coverage for
      per-category PUE/utilization selection, the fallback for
      missing-`category` records, and the new severity thresholds
- [ ] 4.2 `cd backend && python3 -m pytest` passes
- [ ] 4.3 Manual: spot-check a handful of facilities across both
      categories in the running app and confirm impact figures and
      severity badges look directionally correct (e.g. a small
      general-purpose colo facility no longer reads "critical" purely
      from a bucket sized for 1000MW+ frontier campuses)
