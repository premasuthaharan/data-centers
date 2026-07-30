## 1. Design decision
- [x] 1.1 Decide the utilization factor to assume (e.g. industry-typical
      70-90% of nameplate) and record the rationale — chose 80% (midpoint
      of the suggested 70-90% range), documented in SOURCES.md
- [x] 1.2 Decide whether `power_mw` in the source data represents IT load
      or total facility draw, and adjust the PUE multiplication accordingly
      so it isn't double-counted or omitted — `power_mw` (Epoch AI's
      "Current power") is IT/critical load, consistent with how
      `waste_heat_mw` already treated it; PUE 1.3 is now applied to
      `annual_kwh` as well so facility draw = IT load * PUE

## 2. Implementation
- [x] 2.1 Update `compute_impact()` in `logic.py`: apply the utilization
      factor and PUE consistently when computing `annual_kwh`
- [x] 2.2 Ensure `waste_heat_mw` (currently `power_mw * 0.3`, i.e. PUE 1.3)
      stays consistent with whatever PUE value is now used upstream — pull
      both from one named constant instead of two separate hardcoded
      numbers (`0.3` here, implicit `1.3` in the energy total) — added
      `UTILIZATION_FACTOR` and `PUE` module-level constants in `logic.py`

## 3. Downstream review
- [x] 3.1 Re-check frontend static copy in `DataCenterCard.jsx` for any
      hardcoded example numbers that assumed the old calculation — confirmed
      no hardcoded figures exist; all values render live from `impact.*`
- [x] 3.2 Recompute and sanity-check a few known facilities' figures (e.g.
      against public reporting where available) after the change — checked
      Colossus 2 (946 MW nameplate): ~8.6 TWh/yr annual draw, ~284 MW waste
      heat, both plausible order-of-magnitude for a hyperscale AI campus
      this size

## 4. Verification
- [x] 4.1 Confirm `annual_kwh`, `homes_powered`, `annual_cost_millions_usd`,
      `water.daily_withdrawal_mgd`, and `carbon.annual_co2_tonnes` all shift
      consistently and remain internally coherent with `waste_heat_mw` —
      covered by `test_waste_heat_and_annual_kwh_share_the_same_pue` and
      `test_annual_kwh_applies_utilization_and_pue_to_nameplate_power` in
      `tests/test_logic.py`
