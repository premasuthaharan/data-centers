## 1. Retrieve source data

- [x] 1.1 Fetch trackpolicy.org's `#datacenters` list in full — investigate
      whether it's backed by a fetchable JSON/CSV endpoint (inspect network
      requests / page source) rather than relying on the rendered page,
      since the site claims 310 facilities but only a handful render
      without interaction
- [x] 1.2 Record whatever fields trackpolicy.org actually provides per
      facility (name, address/location, operator, status, power_mw,
      cost_usd_billions) and note which are missing per-entry

## 2. Cross-reference against existing dataset

- [x] 2.1 Match trackpolicy.org entries against
      `backend/data/datacenters.json` by name and address to build a list
      of facilities we don't yet have
- [x] 2.2 For ambiguous matches (same operator/region, different naming),
      resolve manually rather than guessing — false "new" entries would
      duplicate existing facilities

## 3. Add new entries

- [x] 3.1 For each new facility, geocode the address via `fetch_data.py`'s
      existing Nominatim flow to get `lat`/`lng`/`geocode_precision`
      consistent with current entries
- [x] 3.2 Fill `carbon_intensity_gco2_per_kwh`, `renewable_pct`,
      `electricity_price_usd_per_kwh`, `water_liters_per_kwh` from
      `fetch_data.py`'s existing per-country `GRID_DATA` table
- [x] 3.3 Set `power_mw`/`cost_usd_billions` from trackpolicy.org where
      available; set `data_status: "announced"` (per existing convention)
      where `power_mw` is unknown
- [x] 3.4 Assign each new entry a stable `id` following the existing
      slug convention (see current entries like `colossus-2`)
- [x] 3.5 Merge new entries into `backend/data/datacenters.json`, leaving
      all existing entries unmodified

## 4. Update docs

- [x] 4.1 Update `openspec/project.md`'s entry count and source
      description to include trackpolicy.org and the new total

## 5. Verification

- [x] 5.1 `cd backend && python3 -m pytest` passes (existing tests read
      `datacenters.json` — confirm no schema assumptions break)
- [x] 5.2 `cd frontend && npm test` passes
- [x] 5.3 Manual: run the app, confirm new facilities render on the map
      and open correctly in the detail card with no missing-field errors
- [x] 5.4 Manual: spot-check a handful of new entries' coordinates land on
      the correct real-world location
