## Why

`water.severity` (`low`/`moderate`/`high`/`critical`, computed in
`compute_impact()` in `backend/logic.py`) is the only impact metric with a
real severity scale and color treatment today — `WATER_COLORS` in both
`NearMePanel.jsx` and `DataCenterCard.jsx` maps it to
green/amber/orange/red. Every other stat shown alongside it renders as
plain, uncolored text: in `NearMePanel.jsx`'s "Nearest to you" list,
"Grid price lift", "Cars equivalent", and "Households equivalent" all sit
right next to the color-coded "Water: moderate" with no visual treatment
at all, which reads as inconsistent — water looks meaningfully flagged,
everything else looks like inert data. `DataCenterCard.jsx` has a milder
version of the same problem: `price_lift_pct` gets a single hardcoded
accent color (`#f59e0b`, amber, applied unconditionally regardless of
whether the lift is 0.5% or 15%), while `cars_equivalent` and
`renewable_pct` get no color at all.

The underlying gap: only `water.severity` has an actual bucketed severity
concept computed server-side. Extending the same *visual pattern* to other
metrics means defining real thresholds for them too, not just picking
colors — a raw number with no scale can't be meaningfully color-coded.

## What Changes

- Define severity thresholds (low/moderate/high/critical, consistent with
  water's four-tier scale and shared color palette) for:
  - **Grid price lift %** (`electricity.price_lift_pct`) — thresholds
    based on the existing formula's own anchors already documented in
    `logic.py` (100MW≈+2%, 1000MW≈+8%, capped at 15%), e.g. low <2%,
    moderate 2–8%, high 8–12%, critical >12% (exact cutoffs to be tuned
    during implementation against the real data distribution, not
    invented arbitrarily).
  - **Grid renewables %** (`carbon.renewable_pct`) — inverted scale (higher
    is better): critical <15%, high 15–30%, moderate 30–50%, low >50%.
  - Leave **cars/homes/households-equivalent** counts uncolored — these
    are pure unit-conversion display numbers (an equivalence, not a
    stress/risk measure), so a severity scale doesn't map onto them
    meaningfully the way it does for water stress or price pressure;
    document this distinction so it doesn't get "fixed" inconsistently
    later.
- Decide where this computation lives: either (a) server-side in
  `compute_impact()`, adding `price_lift_severity`/`renewable_severity`
  fields alongside the existing `water.severity`, keeping all threshold
  logic in one place consistent with how water severity already works, or
  (b) client-side shared helper (e.g. `frontend/src/components/
  severityColors.js`) if these are considered presentation-only framing
  rather than data the backend should assert. Recommend (a) for
  consistency with the existing water-severity precedent and so
  `aggregate_impact()`/`/api/scenario` responses could eventually report
  severity-bucket counts for these metrics too, the same way
  `water_severity_counts` already works.
- Extract the current inline `WATER_COLORS` map (duplicated identically in
  both `NearMePanel.jsx` and `DataCenterCard.jsx`) into one shared color
  helper, and reuse it for the new severity fields too, so all four
  severity-coded metrics share one palette/lookup instead of each
  component defining its own.
- Apply the resulting colors consistently in both `NearMePanel.jsx`'s
  ranked-list stats and `DataCenterCard.jsx`'s stat rows, replacing
  `price_lift_pct`'s current hardcoded `accent="#f59e0b"`.

## Impact

- Affected code: `backend/logic.py` (new severity fields, if approach (a)
  is chosen), `backend/tests/test_logic.py`, new shared
  `frontend/src/components/severityColors.js` (or similar) replacing the
  duplicated `WATER_COLORS` constants, `frontend/src/components/
  NearMePanel.jsx`, `frontend/src/components/DataCenterCard.jsx`, and
  their tests.
- If severity fields are added server-side, this is additive to
  `compute_impact()`'s return shape — no breaking changes to
  `/api/datacenters`, `/api/datacenters/nearest`, or `/api/scenario`.
- Independent of the other pending UI-fix proposals
  ([[fix-text-contrast]], [[fix-sidebar-text-size]],
  [[fix-map-control-theme]], [[add-light-mode-toggle]],
  [[redesign-compare-facility-picker]]) — different concern (semantic
  color-coding vs. contrast/size/theme/interaction), can ship in any
  order. If [[add-light-mode-toggle]] lands first, the severity color
  palette should get a light-theme variant too, the same as any other
  themed color.
