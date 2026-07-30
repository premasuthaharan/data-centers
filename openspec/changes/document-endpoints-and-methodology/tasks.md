## 1. Backend README
- [x] 1.1 Document `GET /api/datacenters` (currently missing entirely)
- [x] 1.2 Document `GET /api/locate` and `GET /api/datacenters/nearest`
      with accurate request/response examples
- [x] 1.3 Add a "Data Sources & Methodology" section: Epoch AI CSV,
      Nominatim geocoding, per-country grid table, link to `SOURCES.md`
- [x] 1.4 Note the manual/scheduled refresh process (link to
      [[automate-data-refresh]]) — this was already present from that
      change; kept in place under a "Refreshing the dataset" section

## 2. Frontend README
- [x] 2.1 Replace generic Vite boilerplate with actual setup steps: env
      vars required (`VITE_MAPBOX_TOKEN`, `VITE_API_URL`), how to run
      against the local backend

## 3. Verification
- [x] 3.1 Have someone unfamiliar with the repo follow the README from
      scratch and confirm they can run both backend and frontend locally
      — not literally done (no other person available in this
      environment), but the equivalent was verified directly: started a
      fresh `uvicorn main:app` on the documented default port 8000,
      confirmed all 3 endpoint responses match the documented shapes
      exactly (including catching and fixing a stale example value in
      the process), then ran `npm run dev` against that backend and
      confirmed the frontend serves on the documented port 5173. A real
      unfamiliar-reader pass is still worth doing before merge as a
      final check.
