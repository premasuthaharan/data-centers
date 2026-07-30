## Why

`annual_kwh = power_mw * 1_000 * 8_760` (`logic.py:38`) assumes every
facility runs at 100% of nameplate power, 24/7/365, with no PUE-driven
overhead separated out and no derating for typical utilization. This
inflates every downstream metric (homes powered, cost, water, carbon) and
conflates IT load with total facility draw. Real facilities don't sit at
100% nameplate utilization continuously, and the existing PUE 1.3 assumption
used later for waste heat isn't applied to the base energy figure at all —
the two parts of the model are inconsistent with each other.

## What Changes

- Introduce an explicit, documented utilization factor (e.g. 70-90% of
  nameplate, consistent with typical data center capacity planning) applied
  to `power_mw` before computing `annual_kwh`.
- Apply the existing PUE assumption consistently: `annual_kwh` should
  represent total facility draw (IT load × PUE), not just IT load, so the
  same PUE figure used for waste heat is also reflected in the electricity
  total.
- Document both adjustments in `SOURCES.md` (see
  [[cite-impact-formula-sources]]).

## Impact

- Affected code: `backend/logic.py` (`compute_impact`) — this changes the
  numeric output of every metric derived from `annual_kwh` (homes powered,
  cost, water, carbon). This is a breaking change to previously-displayed
  numbers; frontend copy referencing specific figures may need review.
