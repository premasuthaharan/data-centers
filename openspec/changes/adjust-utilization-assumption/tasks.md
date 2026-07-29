## 1. Design decision
- [ ] 1.1 Decide the utilization factor to assume (e.g. industry-typical
      70-90% of nameplate) and record the rationale
- [ ] 1.2 Decide whether `power_mw` in the source data represents IT load
      or total facility draw, and adjust the PUE multiplication accordingly
      so it isn't double-counted or omitted

## 2. Implementation
- [ ] 2.1 Update `compute_impact()` in `logic.py`: apply the utilization
      factor and PUE consistently when computing `annual_kwh`
- [ ] 2.2 Ensure `waste_heat_mw` (currently `power_mw * 0.3`, i.e. PUE 1.3)
      stays consistent with whatever PUE value is now used upstream — pull
      both from one named constant instead of two separate hardcoded
      numbers (`0.3` here, implicit `1.3` in the energy total)

## 3. Downstream review
- [ ] 3.1 Re-check frontend static copy in `DataCenterCard.jsx` for any
      hardcoded example numbers that assumed the old calculation
- [ ] 3.2 Recompute and sanity-check a few known facilities' figures (e.g.
      against public reporting where available) after the change

## 4. Verification
- [ ] 4.1 Confirm `annual_kwh`, `homes_powered`, `annual_cost_millions_usd`,
      `water.daily_withdrawal_mgd`, and `carbon.annual_co2_tonnes` all shift
      consistently and remain internally coherent with `waste_heat_mw`
