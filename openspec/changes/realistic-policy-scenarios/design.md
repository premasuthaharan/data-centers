## Research summary

Fetched trackpolicy.org's `/bills` page directly (not just the `#datacenters`
category-count view). It lists ~100 individual bills with number, state,
category tags, status, and a one-line description of what each bill actually
does. Filtering to bills tagged `Data Centers` and cross-referencing against
the 8 categories named in the proposal, three mechanics recur across multiple
states/sponsors (not one-off proposals), meaning they represent a real
legislative pattern rather than a single bill:

1. **Ratepayer cost allocation / "large-load rate class"** — utilities must
   bill data centers via a separate rate class or cost-recovery rule so
   residential ratepayers don't subsidize their grid-interconnection costs.
   Seen in: federal HB9655 (FAIR Data Act), Michigan SB1047, New Jersey A796
   and S731, North Carolina S730 (Ratepayer Protection Act), California
   SB1168. This is the single most common `Data Centers` + `Energy Rates`
   pattern in the dataset.
2. **Tax incentive rollback** — states repealing or restricting sales/property
   tax exemptions previously granted to data center equipment purchases.
   Seen repeatedly in Pennsylvania (HB2198, HB2532, SB1344 all repeal the
   same incentive program) and Ohio (HB957 ends new sales tax exemptions
   outright).
3. **Hyperscale moratorium / permitting pause** — a size-gated, time-boxed
   halt on new large-facility approvals pending review. Seen in: New York
   Executive Order 62 (pauses discretionary environmental permits for
   facilities ≥50MW for up to a year), Michigan SB1018, Delaware SB353,
   Pennsylvania SB1359/HB2496, federal HB9442.

Existing environmental presets (renewable mandate, grid decarbonization, PUE
standard, water recycling) were checked against the same bill set. No bill
specifies a numeric target as clean as "100% renewable" or "PUE 1.1" — most
environmental bills in the dataset are *reporting/study* mandates (e.g. NJ
S3379, CA AB1577, Ohio HB646) rather than hard targets. Since no more
realistic numeric target is discoverable, the four existing presets are kept
as-is with corrected description text, rather than invented at a false
precision. (Recalibration task 3.2 is effectively a no-op for this reason —
documented rather than silently skipped.)

## Schema design

None of the three mechanics need new per-facility data beyond what the
dataset already carries:

- **Cost allocation reform**: modeled as a markup on the existing
  `electricity_price_usd_per_kwh` field for facilities above a size
  threshold, applied in `compute_impact`. No new field.
- **Tax incentive rollback**: needs a value that doesn't exist yet — how much
  of a facility's effective cost is currently offset by a tax abatement.
  Added as a new **per-country** heuristic field `tax_incentive_pct` in
  `fetch_data.py`'s `IMPACT_RATES` (same pattern as electricity price/water
  intensity), not per-facility, since no per-facility incentive data is
  sourceable from Epoch AI or trackpolicy.org today. Documented in
  SOURCES.md as an internal heuristic estimate.
- **Hyperscale moratorium**: reuses existing `power_mw` and `data_status`
  fields — no new data.

## API shape

`ScenarioOverrides` gains three optional boolean-ish fields:
`cost_allocation_reform: bool`, `tax_incentive_rollback: bool`,
`hyperscale_moratorium_mw: float | None` (threshold in MW; presence enables
the moratorium, matching the existing "presence enables" pattern used by the
four numeric overrides rather than introducing a bool+float pair).
