## Why

The dataset (`backend/data/datacenters.json`, currently 75 entries sourced
from Epoch AI) undercounts what's actually out there. trackpolicy.org
(https://trackpolicy.org/#datacenters) tracks 310 facilities globally
representing 114,543 MW and $1.38T in investment — roughly 4x our facility
count. Its visible/headline list already surfaces several large US
facilities we're missing entirely (e.g. AWS's "Project Rainier" campuses in
New Carlisle, IN and Madison County, MS; Meta's "Prometheus" campus in New
Albany, OH; TeraWulf's Somerset, NY site), and likely many more once the
full underlying list is retrieved. A user comparing our map to
trackpolicy.org today sees a visibly sparser, less credible picture of the
industry's footprint.

## What Changes

- Retrieve trackpolicy.org's full data center list (not just the
  page-visible summary — the site claims 310 facilities, so the complete
  set likely requires paging through or fetching whatever endpoint/data
  file backs its `#datacenters` view).
- Cross-reference against `backend/data/datacenters.json` by name +
  address to find facilities trackpolicy.org lists that we don't have, and
  add them as new entries following the existing schema (`id`, `name`,
  `operator`, `country`, `address`, `lat`/`lng`, `geocode_precision`,
  `power_mw`, `data_status`, `cost_usd_billions`,
  `carbon_intensity_gco2_per_kwh`, `renewable_pct`,
  `electricity_price_usd_per_kwh`, `water_liters_per_kwh`).
- New entries get geocoded the same way existing ones are (Nominatim, via
  `fetch_data.py`'s existing flow) rather than hand-entered coordinates, so
  `geocode_precision` stays meaningful and consistent with the rest of the
  dataset.
- Carbon intensity / renewable % / electricity price / water intensity for
  new entries are filled from `fetch_data.py`'s existing per-country
  `GRID_DATA` table (same as every current entry) — trackpolicy.org isn't a
  source for these fields, only for facility identity, location, operator,
  and power/cost figures.
- `power_mw` and `cost_usd_billions` for new entries come from
  trackpolicy.org where it states them; where it doesn't, `data_status`
  falls back to `"announced"` per the existing convention (see
  `logic.py`'s `data_status` default), not a fabricated number.
- Facilities already present in both sources are left untouched — this is
  additive only, not a re-reconciliation of existing entries' numbers.
- Update `openspec/project.md`'s "43 entries" description, which is
  already stale at 75 and will be more so after this change (should
  describe the dataset as sourced from "Epoch AI + trackpolicy.org").

## Impact

- Affected code: `backend/data/datacenters.json` (new entries),
  `backend/fetch_data.py` (if a second source needs its own fetch/merge
  path rather than one-time manual entries — see open question below),
  `openspec/project.md` (entry count + source description).
- Affected specs: none (data-only; no API or UI contract changes — new
  facilities flow through the existing `/api/datacenters` endpoint and
  render via existing map/card components with no code changes required).
- Open question this change should resolve during implementation: is
  trackpolicy.org data added as a one-time manual merge into
  `datacenters.json` (simplest, matches how `location_overrides.json`
  already patches individual entries), or does `fetch_data.py` gain a
  second, ongoing source? Given `fetch_data.py`'s docstring says "run once"
  and the dataset already isn't scheduled (see `Known constraints` in
  `project.md`), a one-time manual merge is the better fit unless the
  user wants trackpolicy.org kept in sync going forward — recommend
  starting with a one-time merge and revisiting only if requested.
- No new facilities should be invented or estimated — if trackpolicy.org's
  full list can't be retrieved (e.g. it requires JS-rendered map
  interaction rather than a fetchable data file), this change should add
  whatever subset is concretely retrievable and note the gap rather than
  guessing at the remainder.
