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
   Pennsylvania SB1359/HB2496, federal HB9442. **Implemented, then dropped**
   during manual verification — see "Mechanic dropped" below.

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
## API shape

`ScenarioOverrides` gains two optional boolean fields: `cost_allocation_reform`
and `tax_incentive_rollback`.

## Mechanic dropped: hyperscale moratorium

Initially implemented as: facilities at `data_status` `announced`/`planned`/
`under_construction` above a 50MW threshold (sourced from NY Executive Order
62) get their impact zeroed out for the scenario.

Manual verification against the real dataset (`backend/data/datacenters.json`)
found this mechanic has **no observable effect on any current facility**: all
16 `announced`-status facilities in the dataset — including the large
pre-construction campuses a moratorium would realistically target, e.g.
`meta-hyperion`, `openai-stargate-michigan` — already have `power_mw: 0.0`.
`compute_impact()`'s existing model derives `annual_kwh`/carbon/water entirely
from `power_mw`, so these facilities already contribute zero to every total at
baseline, before any scenario is applied. Zeroing an already-zero value
produces no visible before/after delta in the tool's totals, which is the
entire point of the scenario UI (`baseline → scenario` deltas). A first
attempted fix — treating "unknown power" as "counts toward the moratorium" —
still produced no visible delta, because the *baseline* was already zero, not
because the scenario logic failed to engage (confirmed correct via direct
`compute_impact()` unit tests).

The real effect of a moratorium bill is preventing future construction (i.e.
these facilities never transition from `announced` to `confirmed`/get a real
`power_mw`), which this tool has no time dimension to represent — it computes
a single present-day snapshot, not a trajectory. Representing that correctly
would require either (a) an estimated "if built" `power_mw` per announced
facility to zero out, which isn't sourceable without speculation, or (b) a
different UI concept entirely (e.g. "N facilities blocked" as a count rather
than a totals delta) — both out of scope for this change. Dropped rather than
shipped as a preset with no observable effect on the shipped dataset.
