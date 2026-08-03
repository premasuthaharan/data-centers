## 1. Research

- [x] 1.1 Fetch trackpolicy.org's bill-level content per category (Grid
      Capacity, Water Consumption, Energy Rates, Tax Incentives,
      Renewable Energy, Job Creation, Local Control, Noise & Vibration) —
      the category names alone aren't enough to design scenario mechanics
- [x] 1.2 From that research, shortlist 3-5 concrete scenario mechanics
      that reflect real, currently-debated bill types (not hypothetical
      "nice round number" targets)
- [x] 1.3 For each shortlisted mechanic, identify what new schema field(s)
      it requires and whether that data is obtainable (from
      trackpolicy.org, Epoch AI, or another concrete source) or would have
      to be a rough/flagged estimate

## 2. Schema and backend

- [x] 2.1 Add whichever new baseline fields the shortlisted mechanics need
      to `backend/data/datacenters.json` (e.g. tax incentive value,
      cost-allocation treatment) — mark clearly as estimates if not
      sourced per-facility (resolved as a per-country heuristic table in
      `logic.py`, not a `datacenters.json` change — no per-facility tax
      incentive data is sourceable today; see design.md)
- [x] 2.2 Extend `ScenarioRequest` in `main.py` and `logic.py`'s scenario
      application to handle the new fields
- [x] 2.3 Backend tests covering the new scenario fields' application
      logic

## 3. Frontend presets

- [x] 3.1 Add new presets to `ScenarioPanel.jsx`'s `PRESETS` for each
      shortlisted mechanic, with description text describing the general
      policy category it reflects (no specific bill numbers unless
      concretely sourced)
- [x] 3.2 Recalibrate existing environmental presets' target numbers to
      real values found during research, where discoverable, replacing
      today's round placeholders (100%, 50 gCO2/kWh, 1.1 PUE, 1.0 L/kWh)
      (no cleaner numeric target was discoverable — real environmental
      bills in the dataset are reporting/study mandates, not hard
      targets, so the four presets are kept as-is; see design.md)
- [x] 3.3 If a new mechanic needs an input control beyond the existing
      preset-button pattern (e.g. a toggle for cost-allocation on/off
      rather than a numeric target), design and add it consistent with
      the panel's existing style (both shipped mechanics fit as
      fixed-value preset buttons; no new control needed)

## 4. Tests and verification

- [x] 4.1 `cd backend && python3 -m pytest` passes
- [x] 4.2 `ScenarioPanel.test.jsx` covers new presets
- [x] 4.3 `cd frontend && npm test` passes
- [x] 4.4 Manual: apply each new preset and confirm totals/detail-card
      deltas reflect the intended policy mechanic correctly (verified via
      direct API calls against the running backend: cost allocation reform
      and tax incentive rollback both raise `annual_cost_millions_usd`
      while leaving CO2/water/kWh untouched, individually and combined in
      "Aggressive Policy"; a third mechanic, hyperscale moratorium, was
      dropped during this step — see design.md's "Mechanic dropped"
      section for why)
