## Why

`ScenarioPanel.jsx`'s five presets (`PRESETS`, lines 7-43) only tune four
generic global knobs: `renewable_pct`, `carbon_intensity_gco2_per_kwh`,
`pue`, and `water_liters_per_kwh`, each snapped to a single round-number
target (100% renewable, 50 gCO2/kWh, PUE 1.1, 1.0 L/kWh) applied uniformly
to every facility regardless of jurisdiction. trackpolicy.org's actual
legislative tracking (310 facilities, categorized under Grid Capacity,
Water Consumption, Energy Rates, Tax Incentives, Renewable Energy, Job
Creation, Local Control, and Noise & Vibration, with real bills addressing
infrastructure cost allocation and workforce development) shows what real
data center policy debates are actually about — and it's broader and more
specific than "impose a nice round efficiency number." Real bills don't
say "PUE must be 1.1 everywhere"; they say things like "data centers pay
their own grid interconnection costs" or "utilities may not shift
data-center infrastructure costs onto residential ratepayers" (cost
allocation), or impose per-facility permitting/noise setbacks (Local
Control, Noise & Vibration — [[trackpolicy-datacenters]]'s TeraWulf
Somerset entry already notes real noise concerns). Today's scenarios can't
represent any of that, because the underlying schema only has
environmental/efficiency fields, not cost-allocation or regulatory ones.

This makes the scenario tool feel more like a generic "what if things were
better" toy than a policy-analysis tool grounded in what's actually being
legislated.

## What Changes

- Research trackpolicy.org's actual tracked bill categories in more depth
  (the current dataset only has the 8 category names + aggregate
  stats — the real content is in individual bill summaries per category,
  which needs to be fetched/read, not assumed) to identify 3-5 concrete,
  realistic scenario mechanics beyond the current environmental knobs.
  Likely candidates based on the category names already known:
  - **Cost allocation** (Grid Capacity / Energy Rates): a scenario where
    data centers bear their own interconnection/grid-upgrade costs rather
    than costs being socialized across all ratepayers — this needs a new
    schema field (e.g. a cost-allocation flag or ratepayer-impact metric)
    since nothing today models who pays for grid capacity.
  - **Tax incentive rollback**: a scenario reflecting jurisdictions ending
    sales/property tax abatements for data centers — needs a
    `tax_incentive_usd` or similar field per facility, which the dataset
    doesn't have today.
  - **Local moratorium / permitting slowdown**: a scenario modeling what
    happens if `"planned"`/`"under_construction"` facilities (once
    [[facility-lifecycle-status]] lands) are blocked or delayed by
    local control ordinances — this scenario type depends on that change.
  - Existing environmental presets (renewable mandate, grid
    decarbonization, PUE standard, water recycling) stay, since they do
    reflect real policy categories (Renewable Energy, Water Consumption)
    — but should be recalibrated to match real bill targets found during
    research rather than round placeholder numbers, where trackpolicy.org
    data makes a real target discoverable.
- Extend the scenario schema (`ScenarioPanel.jsx`'s `PRESETS`, the
  `POST /api/scenario` request/response in `main.py`, and `logic.py`'s
  scenario application logic) to support whichever new fields the
  research above identifies — likely requires new per-facility baseline
  data (e.g. current tax incentive value, current cost-allocation
  treatment) that today's schema doesn't carry, meaning this change may
  need its own data-collection step similar to
  [[trackpolicy-datacenters]].
- Each new preset gets a short citation/description referencing the kind
  of real bill it reflects (not a specific bill number unless one is
  concretely sourced), so the tool's framing stays honest about being
  policy-realistic rather than implying it's tracking specific live
  legislation.

## Impact

- Affected code: `frontend/src/components/ScenarioPanel.jsx` (new
  presets, possibly new input controls beyond the current 4 numeric
  knobs), `backend/main.py`'s `ScenarioRequest`/`POST /api/scenario`
  (new scenario fields), `backend/logic.py` (application logic for new
  fields), `backend/data/datacenters.json` (new baseline fields if new
  presets need per-facility data that doesn't exist yet, e.g. current tax
  incentive amounts).
- This is the least concretely scoped of the four changes — unlike
  build-date or lifecycle-status, "realistic policy scenarios" requires
  original research into trackpolicy.org's bill-level content (not just
  its category list) before the specific new fields/presets can be
  nailed down. Implementation should start with that research and treat
  the mechanics above as candidates, not a final spec.
- Independent of the other three changes except where noted above (the
  moratorium scenario wants [[facility-lifecycle-status]]); the
  environmental-preset recalibration and cost-allocation/tax-incentive
  work can proceed without them.
