## 1. Geocoding precision tracking
- [ ] 1.1 In `fetch_data.py`'s geocode function, track which query tier
      succeeded (full address vs. country-only vs. none) and return it
      alongside lat/lng
- [ ] 1.2 Add `geocode_precision` to each written record in
      `datacenters.json`
- [ ] 1.3 If geocoding fails entirely, do not write a fallback US-center
      coordinate — write `lat: null, lng: null` and `geocode_precision:
      "failed"` instead

## 2. Data cleanup
- [ ] 2.1 Re-run `fetch_data.py` (or a targeted re-geocode) for all entries
      currently at the known bad fallback coordinates
- [ ] 2.2 Manually verify `alibaba-zhangbei` and any other non-US facility
      resolves to a coordinate actually within its stated country
- [ ] 2.3 Regenerate `backend/data/datacenters.json` and `fetch_log.txt`

## 3. Frontend handling
- [ ] 3.1 In `Map.jsx`, render markers with `geocode_precision !=
      "address"` with a distinct style (e.g. dashed ring)
- [ ] 3.2 Skip markers with `lat: null`/`lng: null` rather than plotting at
      `(0,0)` or crashing
- [ ] 3.3 Add a tooltip/label noting "approximate location" for imprecise
      entries

## 4. Verification
- [ ] 4.1 Spot-check every non-US entry in the regenerated dataset against
      its stated country on a map
- [ ] 4.2 Confirm no two unrelated facilities still share an identical
      fallback coordinate
