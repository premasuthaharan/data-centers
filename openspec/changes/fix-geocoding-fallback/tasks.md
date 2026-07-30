## 1. Geocoding precision tracking
- [x] 1.1 In `fetch_data.py`'s geocode function, track which query tier
      succeeded and return it alongside lat/lng. Ended up as **three**
      tiers, not two: `"address"` (full verbatim address matched),
      `"approximate"` (simplified city/region query matched — discovered
      during testing that this tier can still be thousands of km off, e.g.
      Alibaba Zhangbei resolved ~2,760km from its real location under this
      tier), `"country"` (bare country-name query matched)
- [x] 1.2 Add `geocode_precision` to each written record in
      `datacenters.json`
- [x] 1.3 If geocoding fails entirely, do not write a fallback US-center
      coordinate — write `lat: null, lng: null` and `geocode_precision:
      "failed"` instead (verified 0 entries currently hit this path — all
      75 rows in the live Epoch AI feed resolve at some tier)

## 2. Data cleanup
- [x] 2.1 Re-ran `fetch_data.py` live (full Epoch AI CSV + Nominatim) rather
      than patching in place — the live feed has grown to 75 entries (was
      43 in the stale snapshot)
- [x] 2.2 Manually verified `alibaba-zhangbei`: no longer lands at the old
      bogus US-border coordinate; now correctly tagged `"approximate"`
      since even its resolved point is ~2,760km from real Zhangjiakou,
      Hebei — this is a real Nominatim/free-geocoder limitation for some
      Chinese addresses, not something further code changes can fix, but
      it's now honestly labeled instead of silently wrong
- [x] 2.3 Regenerated `backend/data/datacenters.json` and `fetch_log.txt`.
      Final precision breakdown: 34 address / 24 approximate / 17 country
      / 0 failed

## 3. Frontend handling
- [x] 3.1 In `Map.jsx`, render markers with `geocode_precision !=
      "address"` with a distinct style (yellow stroke + thicker ring —
      Mapbox circle layers don't support dashed strokes, only line layers
      do, so color/width is the substitute)
- [x] 3.2 Skip markers with `lat: null`/`lng: null` via `hasCoordinates()`
      filter in `buildGeoJSON` rather than plotting at `(0,0)` or crashing
- [x] 3.3 Added a tooltip/label noting "location approximate" (with tier
      detail) for imprecise entries in map popups; also added a matching
      warning line in `DataCenterCard.jsx`'s header (not originally listed
      in this task, but needed for consistency — the detail card is the
      other place a user sees per-facility location data)

## 4. Verification
- [x] 4.1 Spot-check every non-US entry in the regenerated dataset against
      its stated country on a map. All 9 non-US entries fall within their
      stated country's bounding box. Also caught (while scanning all 75
      entries, not just non-US) 2 US entries — `meta-montgomery` and
      `meta-cheyenne` — that had geocoded into the US Virgin Islands due to a
      `_simplify_address` regex bug (see 4.1a below); fixed.
- [x] 4.1a Found and fixed a real bug surfaced by the spot-check:
      `_simplify_address()` assumed the street part always starts with a
      house number, so addresses like "Co Rd 42, Montgomery, AL 36105, USA"
      (road name before the number) fell through to a "last 2 comma parts"
      fallback that dropped the city, producing a bare "AL 36105, USA"
      query — which Nominatim fuzzy-matched to unrelated street/postal
      fragments in the Virgin Islands. Rewrote it to locate the "STATE ZIP"
      token directly and take the preceding part as the city. Re-geocoded
      `meta-montgomery` (-> Montgomery, AL, correct) and `meta-cheyenne`
      (-> Cheyenne, WY, correct); both remain `"approximate"` tier.
- [x] 4.2 Confirm no two unrelated facilities still share an identical
      fallback coordinate. Found the real remaining bug: all 17
      `"country"`-tier entries geocoded to their country's exact centroid,
      so unrelated facilities collided on one point (10 US facilities on
      (39.7837, -100.4459); 2 China facilities on (34.5412, 108.9237)) —
      later markers in z-order were unclickable. Fixed by adding
      `_jitter_country_centroid()` in `fetch_data.py`: a deterministic
      per-facility offset (SHA-256 seeded by facility id, up to 40km from
      centroid) applied only to `"country"`-tier coordinates.
      `geocode_precision` stays `"country"` — this doesn't add precision,
      it only prevents map occlusion. Re-verified after: 0 duplicate
      coordinates remain except 2 legitimate same-site pairs
      (openai-stargate-abilene/crusoe-abilene-expansion share a literal
      street address; qts-richmond-2/qts-richmond-3 are neighboring
      buildings in Sandston, VA).
- [x] 4.3 Visually verify the Map.jsx/DataCenterCard.jsx changes in a
      running browser. Started backend (port 8000) and frontend (port
      5173) dev servers and drove them with a headless-Chromium/Playwright
      script. Confirmed: 75 data centers load and render as markers;
      `meta-montgomery` now plots correctly in Alabama (not the Virgin
      Islands) with a yellow-stroke ring and a "⚠ location approximate
      (city/region-level)" popup tooltip, matching Map.jsx's
      `approxNote()`; no console errors during load or interaction.
