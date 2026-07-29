## 1. Backend README
- [ ] 1.1 Document `GET /api/datacenters` (currently missing entirely)
- [ ] 1.2 Document `GET /api/locate` and `GET /api/datacenters/nearest`
      with accurate request/response examples
- [ ] 1.3 Add a "Data Sources & Methodology" section: Epoch AI CSV,
      Nominatim geocoding, per-country grid table, link to `SOURCES.md`
- [ ] 1.4 Note the manual/scheduled refresh process (link to
      [[automate-data-refresh]])

## 2. Frontend README
- [ ] 2.1 Replace generic Vite boilerplate with actual setup steps: env
      vars required (`VITE_MAPBOX_TOKEN`, `VITE_API_URL`), how to run
      against the local backend

## 3. Verification
- [ ] 3.1 Have someone unfamiliar with the repo follow the README from
      scratch and confirm they can run both backend and frontend locally
