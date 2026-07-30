## Why

`fetch_data.py` geocodes each data center's address via Nominatim. When a
full-address query fails, the code has no visible fallback path recorded in
the output, but the data shows the symptom: several international facilities
end up plotted inside the continental United States. Confirmed case:
`alibaba-zhangbei` (Hebei, China) is stored at `lat: 25.7017448,
lng: -99.236325` — near the US/Mexico border. Multiple other entries share
the exact fallback point `(39.7837304, -100.445882)`, the geographic center
of the contiguous US.

This silently corrupts the map: international facilities render at the wrong
location with no indication anything went wrong.

## What Changes

- In `fetch_data.py`, when a geocode query fails or falls through to a
  coarser query (e.g. country-only), record that explicitly instead of
  silently accepting whatever Nominatim returns.
- Add a `geocode_precision` field to each entry (`"address" | "country" |
  "failed"`).
- Re-run geocoding for the known-bad entries and regenerate
  `datacenters.json`.
- Frontend: visually distinguish (e.g. dashed marker outline, tooltip note)
  any facility with `geocode_precision != "address"`.

## Impact

- Affected specs: none yet (no formal spec exists for this capability).
- Affected code: `backend/fetch_data.py`, `backend/data/datacenters.json`,
  `frontend/src/components/Map.jsx`.
- No breaking API changes — `geocode_precision` is an additive field.
