## Why

`compute_impact()` in `backend/logic.py` already computes plain-language
equivalence framing for two metrics — `cars_equivalent` (annual CO2 ÷ 4.6t)
and `homes_powered` (annual kWh ÷ 10,500) — and `DataCenterCard.jsx` already
displays both ("Cars equivalent", "Homes powered"). But this framing is
incomplete in two ways: water impact only ever shows a raw MGD number and a
`low`/`moderate`/`high`/`critical` severity label, with no equivalent
plain-language translation; and `NearMePanel.jsx` (the panel most focused on
"what does this mean for your community") only surfaces water severity and
grid price lift — it never shows the cars/homes equivalents that already
exist. The project's goal is making impact tangible to a nearby resident,
and right now half the framing work is done but not applied consistently.

## What Changes

- Add a water equivalence to `compute_impact()` in `backend/logic.py`
  (e.g. households'-worth of daily water use, using a documented per-home
  daily consumption constant — add it to `SOURCES.md` alongside the
  existing 4.6t CO2/car and 10,500 kWh/home citations), returned alongside
  `daily_withdrawal_mgd` and `severity` in the `water` block.
  `aggregate_impact()` is unaffected (still sums raw MGD).
- `DataCenterCard.jsx`: display the new water equivalent next to the
  existing MGD/severity display, matching the style of "Cars equivalent" /
  "Homes powered".
- `NearMePanel.jsx`: extend each ranked list item to also surface
  `cars_equivalent` and the new water equivalent (not just severity/price
  lift), reusing `formatters.js` for consistent number formatting rather
  than any new formatting logic.
- No new top-level UI — this is filling in gaps in existing displays, not
  adding a new panel.

## Impact

- Affected code: `backend/logic.py` (`compute_impact`'s `water` block),
  `backend/SOURCES.md` (new constant citation), `backend/tests/
  test_logic.py`, `frontend/src/components/DataCenterCard.jsx`,
  `frontend/src/components/NearMePanel.jsx`, `frontend/src/components/
  formatters.js` (if a shared formatter for the new field is needed),
  associated frontend tests.
- Additive only to `compute_impact()`'s return shape — no existing field
  changes, so [[add-scenario-aggregate-backend]] and
  [[add-scenario-compare-ui]] are unaffected regardless of ship order.
