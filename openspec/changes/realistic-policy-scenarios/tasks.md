## 1. Research

- [ ] 1.1 Fetch trackpolicy.org's bill-level content per category (Grid
      Capacity, Water Consumption, Energy Rates, Tax Incentives,
      Renewable Energy, Job Creation, Local Control, Noise & Vibration) —
      the category names alone aren't enough to design scenario mechanics
- [ ] 1.2 From that research, shortlist 3-5 concrete scenario mechanics
      that reflect real, currently-debated bill types (not hypothetical
      "nice round number" targets)
- [ ] 1.3 For each shortlisted mechanic, identify what new schema field(s)
      it requires and whether that data is obtainable (from
      trackpolicy.org, Epoch AI, or another concrete source) or would have
      to be a rough/flagged estimate

## 2. Schema and backend

- [ ] 2.1 Add whichever new baseline fields the shortlisted mechanics need
      to `backend/data/datacenters.json` (e.g. tax incentive value,
      cost-allocation treatment) — mark clearly as estimates if not
      sourced per-facility
- [ ] 2.2 Extend `ScenarioRequest` in `main.py` and `logic.py`'s scenario
      application to handle the new fields
- [ ] 2.3 Backend tests covering the new scenario fields' application
      logic

## 3. Frontend presets

- [ ] 3.1 Add new presets to `ScenarioPanel.jsx`'s `PRESETS` for each
      shortlisted mechanic, with description text describing the general
      policy category it reflects (no specific bill numbers unless
      concretely sourced)
- [ ] 3.2 Recalibrate existing environmental presets' target numbers to
      real values found during research, where discoverable, replacing
      today's round placeholders (100%, 50 gCO2/kWh, 1.1 PUE, 1.0 L/kWh)
- [ ] 3.3 If a new mechanic needs an input control beyond the existing
      preset-button pattern (e.g. a toggle for cost-allocation on/off
      rather than a numeric target), design and add it consistent with
      the panel's existing style

## 4. Tests and verification

- [ ] 4.1 `cd backend && python3 -m pytest` passes
- [ ] 4.2 `ScenarioPanel.test.jsx` covers new presets
- [ ] 4.3 `cd frontend && npm test` passes
- [ ] 4.4 Manual: apply each new preset and confirm totals/detail-card
      deltas reflect the intended policy mechanic correctly
