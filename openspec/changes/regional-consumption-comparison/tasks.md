## 1. Data sourcing

- [ ] 1.1 Source county-level water withdrawal benchmarks (total, plus
      agricultural/industrial/residential breakdown) — USGS's National
      Water Use Science Project is the recommended starting point for
      U.S. counties
- [ ] 1.2 Derive county for each facility from its existing `lat`/`lng`
      (reverse-geocode or county-boundary lookup), since addresses only
      carry city/state today
- [ ] 1.3 Build a county benchmark dataset keyed by county+state, scoped
      to whatever counties have solid public data — explicitly mark
      others as unavailable rather than estimating

## 2. Backend

- [ ] 2.1 `logic.py`: add `region_context` to a facility's computed
      impact — facility's daily withdrawal as a share of county total,
      agricultural, and residential withdrawal, when benchmark data
      exists for that county
- [ ] 2.2 Omit `region_context` cleanly (not a zero/estimate) for
      facilities in counties without benchmark data
- [ ] 2.3 Backend tests: `region_context` computation correctness, and
      correct omission when no county benchmark exists

## 3. Frontend

- [ ] 3.1 `DataCenterCard.jsx`: add an "In [County, State]" comparison
      strip directly under the existing Water block's
      households-equivalent stat, conditionally rendered only when
      `region_context` is present
- [ ] 3.2 Word the comparison alongside (not replacing) the existing
      households-equivalent framing, e.g. "X% of county water
      withdrawal; ~Y% of county agricultural use"
- [ ] 3.3 `DataCenterCard.test.jsx`: renders the strip when
      `region_context` is present, omits it cleanly when absent

## 4. Verification

- [ ] 4.1 `cd backend && python3 -m pytest` passes
- [ ] 4.2 `cd frontend && npm test` passes
- [ ] 4.3 Manual: spot-check a handful of facilities' county assignments
      and comparison percentages against source USGS data for
      plausibility
- [ ] 4.4 Manual: confirm facilities in counties without benchmark data
      render the rest of the card normally with no broken section
