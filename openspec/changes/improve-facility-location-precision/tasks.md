## 1. Manual research

- [x] 1.1 For each of the 17 `"country"`-precision facilities (listed in
      the proposal — includes `openai-stargate-new-mexico`,
      `google-kansas-city-east`, `amazon-madison-mega-site`, `meta-kuna`,
      `google-storey-county`, `google-mesa`, `huawei-horinger`,
      `vnet-bayin-ulanqab`, `oracle-batam`, `google-papillion`,
      `start-campus-sines-data-campus`, `openai-stargate-michigan`,
      `openai-stargate-milam`, `openai-stargate-uae`,
      `openai-stargate-wisconsin`, `southgate-melbourne`,
      `dayone-nusajaya`), research a specific, sourceable city/region (or
      street address where public reporting names one) from public
      company announcements, news coverage, or permitting records
- [x] 1.2 Record each source (URL + date accessed) in `backend/SOURCES.md`
      under a new section for manually-researched locations, matching the
      documentation style already used for other constants in that file
- [x] 1.3 For any facility where no better public information can
      actually be found, leave it at country-level precision rather than
      guessing — document which ones (if any) fall into this category and
      why (all 17 had at least a city/region publicly reported, so none
      fall into this category — see note at the end of the SOURCES.md
      section)

## 2. Override mechanism

- [x] 2.1 Create `backend/data/location_overrides.json`: `{ "<facility_id>":
      { "address": "...", "lat": ..., "lng": ..., "geocode_precision": "..." } }`
      populated from step 1's research
- [x] 2.2 In `fetch_data.py`, load this file in `main()` and, per record,
      apply the override in place of (or as an additional geocode
      candidate ahead of) the CSV's `Address` field

## 3. Regression guard

- [x] 3.1 In `fetch_data.py`'s `main()`, before writing the new
      `datacenters.json`, load the existing file at that path if one
      exists (handle the first-ever-run case where it doesn't)
- [x] 3.2 Define a precision ordering (`"address" > "approximate" >
      "country" > "failed"`/`None`) and, per facility `id` present in
      both the existing and freshly-generated data, keep the existing
      `lat`/`lng`/`geocode_precision`/`address` if the existing precision
      is strictly better than what the fresh run just produced
- [x] 3.3 Allow the fresh run's data through unchanged when it matches or
      improves on the existing precision — this is a regression guard,
      not a permanent freeze
- [x] 3.4 Log when a regression is prevented (facility id, existing vs.
      attempted precision) so silent overwrites don't hide the fact that
      Nominatim's result quality changed for that query

## 4. Tests

- [x] 4.1 `test_fetch_data.py`: a manual override in
      `location_overrides.json` is applied and produces the expected
      `geocode_precision`
- [x] 4.2 `test_fetch_data.py`: given an existing dataset with a facility
      at `"address"` precision, a simulated fresh run that would only
      achieve `"country"` for that same id preserves the existing
      lat/lng/precision instead of overwriting
- [x] 4.3 `test_fetch_data.py`: given an existing facility at `"country"`
      precision, a fresh run that achieves `"address"` precision *does*
      update — confirm this isn't a blanket freeze
- [x] 4.4 `test_fetch_data.py`: first-ever run (no existing
      `datacenters.json`) doesn't error and proceeds normally

## 5. Verification

- [x] 5.1 `cd backend && pytest` passes
- [x] 5.2 Run `fetch_data.py` end-to-end (or a scoped equivalent) and
      confirm all 17 previously-country-level facilities now show
      improved `geocode_precision`, with `openai-stargate-new-mexico`
      specifically landing inside New Mexico rather than the jittered US
      centroid
- [x] 5.3 Re-run `fetch_data.py` a second time immediately after and
      confirm none of the just-improved facilities regress back to a
      worse precision
