## Why

17 of 75 facilities in `backend/data/datacenters.json` are geocoded at
`"country"` precision (jittered around the country centroid, per
`_jitter_country_centroid` in `fetch_data.py`) rather than a real location.
This happens because those rows have no value in the Epoch AI CSV's
`Address` column, and `fetch_data.py`'s `geocode()` only ever queries
Nominatim using that `Address` field plus `Country` — it never looks at
anything else. But several of these facility *names* already contain a
real, usable location: `"OpenAI Stargate New Mexico"`, `"Google Kansas
City East"`, `"Google Storey County"`, `"Google Mesa"`, `"Google
Papillion"`, `"Amazon Madison Mega Site"`, `"Meta Kuna"`, `"Start Campus
Sines Data Campus"`, `"Oracle Batam"` and others all name a city, county,
or region right in the label, information the pipeline discards today.
The map is misleading for these facilities — "OpenAI Stargate New Mexico"
renders as a generic dot jittered around the geographic center of the
entire United States, nowhere near New Mexico.

Separately, `fetch_data.py`'s `main()` has no concept of "existing" data —
it rebuilds `results` from the Epoch AI CSV from scratch every run, with no
read of the current `backend/data/datacenters.json` at all. That means
even if this change manually improves these 17 facilities' locations today,
the very next scheduled `fetch_data.py` run (see `automate-data-refresh`)
would silently regenerate them back to country-level jittered coordinates,
since nothing carries forward between runs. Fixing the 17 facilities
without also fixing this would be a one-time cosmetic patch that reverts
itself on the next data refresh.

## What Changes

- Manually research and record a better location (city/region-level
  address string suitable for Nominatim, or in some cases a specific
  facility address if publicly documented) for each of the 17
  `"country"`-precision facilities, sourced from public reporting/company
  announcements about each named site — document the source for each in
  `backend/SOURCES.md` alongside the existing per-record provenance notes,
  consistent with how other manual/heuristic decisions in this file are
  already documented.
- Add a `manual_location_override` mechanism: a small, version-controlled
  data file (e.g. `backend/data/location_overrides.json`, keyed by
  facility `id`) holding the researched `address`/`lat`/`lng` for these 17
  (and any future) facilities. `fetch_data.py` checks this file per-record
  and uses it in place of (or in addition to) the CSV's `Address` field
  when present.
- Add the regression check the user specifically asked for: before
  `fetch_data.py` overwrites `backend/data/datacenters.json`, it must read
  the *existing* file (if one exists) and, for each facility `id` that
  already has `geocode_precision` better than what a fresh run just
  produced (e.g. existing is `"address"` but the new run would only
  achieve `"country"`), keep the existing `lat`/`lng`/`geocode_precision`/
  `address` rather than overwriting with a regression. This protects both
  the manually-researched overrides above and any future case where
  Nominatim's response quality varies between runs for the same query.
- Add backend tests covering: a manual override is applied when present;
  an existing better-precision record is preserved when a fresh geocode
  attempt would regress it; a fresh geocode that *improves* on the
  existing precision is still allowed to update (this is not a "never
  overwrite" rule, only a "never regress" rule).

## Impact

- Affected code: `backend/fetch_data.py` (read existing dataset before
  overwriting, apply overrides, regression-guard logic), new
  `backend/data/location_overrides.json`, `backend/SOURCES.md` (citations
  for the 17 researched locations), `backend/tests/test_fetch_data.py`.
- `backend/data/datacenters.json` itself: the 17 affected records get
  updated `lat`/`lng`/`geocode_precision`/`address` values as part of
  implementing this change (a one-time manual research pass, not
  something the automated pipeline can do unattended).
- Complements [[snapshot-history]] (already shipped) — the regression
  guard means future snapshots should only ever show geocode precision
  holding steady or improving for a given facility id, never regressing,
  which is itself a useful invariant for anyone later building a
  snapshot-diffing view.
