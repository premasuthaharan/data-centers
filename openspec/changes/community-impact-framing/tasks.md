## 1. Backend: water equivalence

- [x] 1.1 Pick and document a per-household daily water use constant in
      `backend/SOURCES.md` (e.g. EPA average household daily indoor water
      use), matching the citation style already used for the 4.6t CO2/car
      and 10,500 kWh/home constants — used EPA WaterSense's ~300
      gal/household/day figure
- [x] 1.2 In `compute_impact()` (`backend/logic.py`), compute a
      `households_equivalent` (or similarly named) field from
      `daily_withdrawal_mgd` using the new constant, added to the `water`
      block alongside `daily_withdrawal_mgd` and `severity`
- [x] 1.3 Add/extend `backend/tests/test_logic.py` covering the new field's
      calculation

## 2. Frontend: DataCenterCard

- [x] 2.1 Display the new water household-equivalent in
      `DataCenterCard.jsx` next to the existing water severity/MGD stat,
      matching the "Cars equivalent" / "Homes powered" `StatRow` style

## 3. Frontend: NearMePanel

- [x] 3.1 Extend each ranked list item in `NearMePanel.jsx` to also show
      `cars_equivalent` and the new water equivalent (currently only shows
      water severity and price lift), reusing `formatters.js`

## 4. Tests

- [x] 4.1 `DataCenterCard.test.jsx`: renders the new water equivalent stat
      given a mocked impact payload
- [x] 4.2 `NearMePanel.test.jsx`: extend existing mocked-response test to
      assert cars/water equivalents render per list item

## 5. Verification

- [x] 5.1 `cd backend && pytest` and `cd frontend && npm test` both pass
      (92 backend tests, 47 frontend tests, all green)
- [ ] 5.2 Manual: open a facility's detail card and confirm all three
      equivalences (cars, homes, water households) render with sensible
      numbers; open the near-me panel and confirm the same equivalences
      appear per ranked result
