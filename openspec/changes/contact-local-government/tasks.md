## 1. External lookup decision

- [ ] 1.1 Evaluate address-to-representatives lookup options
      (Google Civic Information API or similar); confirm whether a
      genuinely keyless option exists before committing to one requiring
      an API key
- [ ] 1.2 If an API key is required, confirm ownership/cost/rate-limit
      plan before implementation proceeds

## 2. Backend

- [ ] 2.1 New endpoint `GET /api/datacenters/{id}/representatives`,
      resolving the facility's existing `address` via the chosen lookup
      service
- [ ] 2.2 Cache results per facility (e.g. alongside
      `backend/data/datacenters.json`-adjacent storage), since
      representative data doesn't change often enough to look up per
      request
- [ ] 2.3 Backend tests: successful lookup, cached response reuse,
      graceful handling when the lookup service has no data for an
      address (e.g. non-US facilities, if the chosen API is US-only)

## 3. Frontend

- [ ] 3.1 New "Contact local government" button on
      `DataCenterCard.jsx`'s detail panel, near the existing "Copy link"
      button
- [ ] 3.2 New component rendering resolved representatives (name,
      office, contact method/link) on click, without auto-opening an
      external form
- [ ] 3.3 Handle the no-data case (e.g. non-US facility, lookup failure)
      with a clear message rather than a broken/empty state
- [ ] 3.4 Frontend tests for the new component and button integration

## 4. Verification

- [ ] 4.1 `cd backend && python3 -m pytest` passes
- [ ] 4.2 `cd frontend && npm test` passes
- [ ] 4.3 Manual: click through for a handful of U.S. facilities across
      different states, confirm correct representatives resolve
- [ ] 4.4 Manual: confirm a facility outside lookup coverage (if
      applicable) shows a clean fallback rather than an error
