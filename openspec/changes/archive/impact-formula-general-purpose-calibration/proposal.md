## Why

[[trackpolicy-datacenters]] added 236 general-purpose facilities
(colocation, enterprise, regional cloud availability zones) alongside the
original 82 frontier-AI-lab campuses, via the new `category` field
(`"frontier-ai"` / `"general-purpose"`). Two of `logic.py`'s core impact
constants were calibrated specifically against the old, frontier-AI-only
dataset and no longer describe the wider mix:

- **PUE = 1.3.** `SOURCES.md` says this "approximates a modern, efficient
  facility" rather than the industry-wide average — the [Uptime Institute
  Global Data Center Survey
  2024](https://uptimeinstitute.com/uptime_assets/7425ec68d479c5d78a743df94a79b114ed9f9c73f13b6460949d2b8e73373209-GA-2024-07-uptime-institute-global-data-center-survey-results-2024.pdf)
  reports 1.56 average (1.47 capacity-weighted). The same doc flags that
  "AI training clusters may run closer to continuous full load than
  typical enterprise deployments" — an observation about
  `UTILIZATION_FACTOR` (currently a single global 0.8) that applies here
  too. A single global PUE was a reasonable simplification when every
  entry was a modern hyperscale frontier campus; applied to a 20-year-old
  Equinix carrier hotel or a regional cloud AZ, it systematically
  understates both `annual_kwh` and `waste_heat_mw` for the facility type
  it now most needs to be accurate for, since general-purpose sites are
  the plurality of the dataset (236 of 318).
- **Severity thresholds** (`price_lift_severity`, `water_severity`).
  `SOURCES.md` says these were "tuned against the real distribution... of
  the current 75-facility dataset," which only ever ranged 28-946MW
  `power_mw`. General-purpose facilities range from 5MW (e.g. small
  colocation suites) to 11,000MW (e.g. Fermi America's Texas campus),
  which breaks the thresholds' calibration in both directions: recomputing
  `price_lift_severity` over the current mixed dataset already shows
  `"critical"` ballooning from 8 facilities (original range) to 56, and
  `"low"` from 5 to 56 — the buckets sized for a 28-946MW band no longer
  spread the actual 5-11,000MW distribution meaningfully. A user comparing
  two facilities' severity badges today is comparing numbers computed
  against a scale that no longer matches most of what's on the map.

Both issues share a root cause: single global constants/thresholds
implicitly assumed "every facility is a frontier-AI campus," which was
true of the dataset until [[trackpolicy-datacenters]] landed and is no
longer true today.

## What Changes

- Split `PUE` and `UTILIZATION_FACTOR` in `logic.py` into per-category
  values keyed by the `category` field added in
  [[trackpolicy-datacenters]], instead of the current single global
  constant of each. Frontier-AI campuses keep something close to today's
  optimistic 1.3 PUE / 0.8 utilization (newer, purpose-built, run near
  continuous load); general-purpose facilities get values closer to the
  Uptime Institute's broader survey average. Facilities missing a
  `category` (shouldn't occur post-migration, but keep the fallback
  cheap) default to today's global constants so nothing silently breaks.
- Re-derive `price_lift_severity` and `water_severity` bucket boundaries
  against the full current dataset's actual distribution (all 318
  entries, not just the original 75), following the same "tune against
  observed data, document the derivation" methodology `SOURCES.md`
  already uses — not a fixed guess at new numbers. Evaluate whether a
  single re-tuned global threshold set (spread across the new 5-11,000MW
  range) is sufficient, or whether category-aware buckets are warranted,
  since a 56-facility "critical" bucket dominated by outliers like the
  11,000MW entry could still wash out meaningful distinctions among the
  more-typical 20-500MW facilities that make up most of the dataset.
- Update `SOURCES.md` with the new derivation for every constant touched,
  matching its existing standard of citing the source dataset and
  reasoning shown for PUE/utilization/thresholds today — not just new
  numbers with no paper trail.
- No change to raw input fields (`power_mw`, `carbon_intensity_gco2_per_kwh`,
  etc.) or to the API response shape beyond whatever new severity bucket
  boundaries fall out of re-tuning — `category` already exists on every
  entry from [[trackpolicy-datacenters]].

## Impact

- Affected code: `backend/logic.py` (`PUE`, `UTILIZATION_FACTOR`,
  `price_lift_severity` thresholds, `water_severity` thresholds,
  `compute_impact`), `backend/SOURCES.md` (documentation for every
  constant touched).
- Affected specs: none directly (no API contract/shape change), but every
  facility's computed `impact` values will change numerically —
  `annual_kwh`, `annual_co2_tonnes`, `waste_heat_mw`,
  `price_lift_severity`, `water_severity` will differ from today's output
  for some or all facilities depending on category and prior threshold
  placement. This is a correction, not a breaking API change, but is
  worth flagging since any cached/shared scenario URLs encoding specific
  severity expectations could read differently after this lands.
- Depends on [[trackpolicy-datacenters]]'s `category` field already being
  present on every entry (it is, as of that change).
- Open question this change should resolve during implementation: are
  category-specific severity thresholds worth the added complexity, or
  does a single re-tuned threshold set (still derived from the full
  318-entry distribution rather than the stale 75-entry one) resolve the
  reported distortion well enough? Recommend starting with a single
  re-tuned global threshold set and only splitting by category if the
  re-tuned buckets still produce a lopsided distribution once measured
  against real data.
