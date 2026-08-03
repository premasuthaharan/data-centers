## Why

The detail panel (`DataCenterCard.jsx`'s `dc-detail-panel`, opened from a
map marker) shows operator, country, and address in its header
(`dc-detail-meta`, lines 100-103) but has no sense of *when* a facility
went up. Combined with [[facility-lifecycle-status]], a user looking
at an "under construction" facility has no way to tell whether it broke
ground last month or is nearly finished — build date is the piece of
context that makes a status badge meaningful rather than just a label.
It's also generally useful for an "operational" facility (how old is this
site, is it a first-generation or recent build) without depending on that
other change landing first.

## What Changes

- Add a `build_date` field to the data schema (`backend/data/
  datacenters.json`). Use year-month precision (`"YYYY-MM"`) rather than a
  full date, since that's the level of precision typically available for
  data center openings (and matches what's realistically extractable from
  trackpolicy.org / Epoch AI-style sources) — avoid implying false
  precision with a full `YYYY-MM-DD`.
- `fetch_data.py`: populate `build_date` for entries where a source date
  is available; leave it `null`/absent for entries where it isn't (no
  fabricated dates).
- `DataCenterCard.jsx`: display build date in the `dc-detail-meta` block
  alongside the existing operator/country/address line, e.g.
  "{operator} · {country} · Built {month year}" or as its own line next to
  the address — same treatment as `dc-address` (conditionally rendered
  only `dc.build_date &&`, so facilities without a known date render
  exactly as they do today).
- No backend computation changes — `build_date` is a display-only field,
  not an input to `logic.py`'s impact math.

## Impact

- Affected code: `backend/data/datacenters.json` (new optional field),
  `backend/fetch_data.py` (populate where available),
  `frontend/src/components/DataCenterCard.jsx` (render in detail header).
- Affected specs: none (additive field + display; no API contract
  changes beyond a new optional key already covered by
  `GET /api/datacenters`' existing pass-through of dataset fields).
- Independent of [[facility-lifecycle-status]] and
  [[trackpolicy-datacenters]] — useful with or without either, though
  it's most informative once combined with the status badge from
  [[facility-lifecycle-status]].
- Purely additive: facilities with no known `build_date` render identically
  to today.
