# Sources for constants in `logic.py`

This document lists every numeric constant used in `compute_impact()`
(`logic.py`), what it's used for, and where the value comes from. Where no
authoritative source exists, the constant is explicitly labeled as an
internal heuristic rather than implied to be industry fact.

---

### Utilization factor = per-category (80% frontier-ai / 65% general-purpose)
- **Used in:** `annual_kwh = power_mw * UTILIZATION_FACTOR * PUE * 1_000 * 8_760` (`logic.py`)
- **Status:** Internal heuristic, not externally sourced.
- **Context:** `power_mw` (Epoch AI's "Current power") is nameplate IT
  capacity; real facilities don't draw 100% of nameplate continuously.
  70-90% is a commonly cited range for average utilization in data center
  capacity planning; 80% is the midpoint, chosen as a single representative
  planning estimate. [[trackpolicy-datacenters]] added 236 general-purpose
  facilities (colocation, enterprise, regional cloud AZs) alongside the
  original 82 frontier-AI-lab campuses, via the `category` field. AI
  training clusters run closer to continuous full load than typical
  enterprise/colo deployments (higher, steadier batch/serving demand vs.
  bursty enterprise traffic and multi-tenant colo space that's rarely
  fully leased), so utilization is now split by `category`
  (`UTILIZATION_FACTOR_BY_CATEGORY` in `logic.py`):
  - `frontier-ai`: 80% — unchanged from the original single-value estimate.
  - `general-purpose`: 65% — lowered from the 70-90% planning range to
    reflect non-training workloads' more variable load and typical colo
    occupancy (multi-tenant space is rarely 100% leased/active). Still an
    internal planning estimate, not a measured fleet average.
  - Records missing `category` (shouldn't occur post-migration) fall back
    to 80%, i.e. today's prior global constant, via `UTILIZATION_FACTOR`.

### PUE (Power Usage Effectiveness) = per-category (1.3 frontier-ai / 1.56 general-purpose)
- **Used in:**
  - `annual_kwh = power_mw * UTILIZATION_FACTOR * PUE * 1_000 * 8_760` (`logic.py`) —
    total facility draw (IT load + cooling/other overhead), not just IT load.
  - `waste_heat_mw = power_mw * (PUE - 1)` (`logic.py`)
  - Both read the same resolved `pue` value within a single `compute_impact`
    call so the electricity total and the waste-heat estimate stay
    consistent with each other.
- **Status:** Internal heuristic, not externally sourced.
- **Context:** The most recent industry-wide figure is the
  [Uptime Institute Global Data Center Survey 2024](https://uptimeinstitute.com/uptime_assets/7425ec68d479c5d78a743df94a79b114ed9f9c73f13b6460949d2b8e73373209-GA-2024-07-uptime-institute-global-data-center-survey-results-2024.pdf),
  which reports an average PUE of **1.56** (1.47 when capacity-weighted
  toward larger, newer facilities). The original 1.3 constant was
  calibrated against the dataset when every entry was a modern,
  purpose-built frontier-AI campus — appropriate for that subset but too
  optimistic once [[trackpolicy-datacenters]] added 236 general-purpose
  facilities, including decades-old colocation carrier hotels and regional
  cloud availability zones that look nothing like a new hyperscale
  campus. PUE is now split by `category` (`PUE_BY_CATEGORY` in
  `logic.py`):
  - `frontier-ai`: 1.3 — unchanged; still more optimistic than the survey
    average, approximating a modern, efficient purpose-built facility.
  - `general-purpose`: 1.56 — the Uptime Institute's fleet-wide average,
    used as-is (not the 1.47 capacity-weighted figure, since
    general-purpose facilities skew toward smaller/older sites, not the
    largest/newest ones the capacity-weighted figure emphasizes).
  - Records missing `category` fall back to 1.3, i.e. today's prior global
    constant, via `PUE`.
  - Treat `waste_heat_mw` and the PUE-inflated portion of `annual_kwh` for
    `frontier-ai` facilities as best-case estimates, not a fleet average;
    `general-purpose` figures now track the broader survey average
    directly.

### IT density = 10 kW/m² (`footprint_m2 = power_mw * 100`)
- **Used in:** `footprint_m2` (`logic.py:66`)
- **Status:** Internal heuristic, not externally sourced.
- **Context:** No single authoritative figure exists for facility-wide floor
  density; per-rack density varies enormously by era and workload (2-5 kW/rack
  historically, 12 kW/rack average per AFCOM's 2024 State of the Data Center
  Report, 30-85+ kW/rack for high-density AI deployments). 10 kW/m² is a
  rough mid-range planning estimate for whole-building average density
  (racks + aisles + support space), not a cited industry standard.

### Water intensity = 3.0 L/kWh (blended) — global default only
- **Used in:** `water_mgd` fallback when `water_liters_per_kwh` is missing
  from a record (`logic.py`)
- **Status:** Internal heuristic (blended estimate), not a single external source.
- **Context:** Reported figures vary widely by cooling technology and
  climate: industry surveys commonly cite an average water usage
  effectiveness (WUE) of **~1.8 L/kWh**, direct/air-cooled facilities can be
  as low as ~0.15-1 L/kWh (e.g., some hyperscaler sites), and evaporative
  cooling towers in hot/dry climates can exceed 7-9 L/kWh. 3.0 L/kWh is a
  blended midpoint chosen to represent a mixed fleet, not a measured or
  published average. This value is now only used as a fallback — see
  "Per-country water intensity" below for the primary source of this figure.

### Per-country water intensity (`IMPACT_RATES` in `fetch_data.py`)
- **Used in:** `water_liters_per_kwh` field on each data center record, read
  by `water_mgd` in `logic.py`
- **Status:** Internal heuristic per country, not a single authoritative
  source per country.
- **Context:** Values are a judgment call blending two proxies: (1) the
  blended 3.0 L/kWh internal midpoint above as a baseline, and (2) each
  country's climate/water-stress profile (using WRI Aqueduct water-stress
  categories as informal guidance) as a proxy for how much a facility there
  likely relies on evaporative cooling. Hot/arid countries (e.g. Bahrain,
  United Arab Emirates, Israel) are set well above the baseline; cold/wet
  countries (e.g. Sweden, Norway, Finland, Switzerland) are set below it.
  These are starting estimates for cross-country comparison, not measured
  facility-level water withdrawal. Countries not in the table use the
  3.0 L/kWh default above, unchanged from the prior global constant.

### State water stress category (`STATE_WATER_STRESS` in `logic.py`)
- **Used in:** `water.stress_category` in `compute_impact`'s output — a
  categorical badge (e.g. "extremely high") shown alongside a facility's
  own water withdrawal figures in the UI, distinct from `water_severity`
  (which is derived from the facility's own MGD, not regional context).
- **Status:** Internal categorical judgment per state, not a precise
  per-state statistic. Same sourcing approach as "Per-country water
  intensity" above.
- **Context:** Labels ("low", "moderate", "high", "extremely high") follow
  WRI Aqueduct's own category naming as informal guidance for each state's
  general baseline water stress (arid Southwest states like AZ/NM/CA/NV
  rated "extremely high"; wetter Midwest/Northeast states like IA/OH/NY
  rated "low"), not a lookup against Aqueduct's precise numeric index.
  Only covers states with facilities in the current dataset — states not
  listed return `None` (unavailable), not a default/estimated category.

### Water severity thresholds (1 / 2.5 / 5 MGD → low/moderate/high/critical)
- **Used in:** `water_severity` (`logic.py`)
- **Status:** Internal heuristic, not externally sourced. **No EPA baseline
  for these specific thresholds was found.** The previous comment claiming
  "US EPA baseline thresholds" was inaccurate and has been removed.
- **Context:** EPA and USGS publish water withdrawal *permit* thresholds
  (e.g., 100,000 gallons/day triggers permitting in some states) and
  regional water-stress indicators, but no EPA source ties specific
  facility withdrawal volumes (in MGD) to "low/moderate/high/critical"
  labels. These bucket boundaries were chosen internally to spread
  observed data center withdrawal volumes across a readable severity scale.
  Originally tuned (1 / 5 / 15 MGD) against the 75-facility frontier-AI-only
  dataset. [[trackpolicy-datacenters]]'s 236 general-purpose facilities plus
  the per-category PUE/utilization split above (see "PUE" and "Utilization
  factor") shifted the full 318-entry `water_mgd` distribution to 0.06-162.65
  MGD (p25 1.13, median 2.31, p75 4.55) — with the old 1/5/15 buckets, 153 of
  287 powered facilities (53%) landed in a single "moderate" bucket,
  collapsing the distinction the scale exists to make. Re-tuned to 1 / 2.5 /
  5 MGD, close to the actual quartile boundaries, giving a roughly even
  split (68 / 86 / 67 / 66 across low/moderate/high/critical) that still
  distinguishes small colo suites from the largest hyperscale/frontier
  sites. A single global threshold set was kept rather than splitting by
  category — `water_mgd` is driven primarily by `power_mw` scale, and the
  re-tuned buckets already spread both categories' facilities without a
  category-aware split.

### Grid price lift severity thresholds (5 / 6 / 7% → low/moderate/high/critical)
- **Used in:** `price_lift_severity` (`logic.py`, `electricity` block)
- **Status:** Internal heuristic, not externally sourced. Originally tuned
  against the 75-facility frontier-AI-only dataset; re-validated (values
  unchanged) against the full 318-entry mixed-category dataset after
  [[trackpolicy-datacenters]].
- **Context:** `price_lift_pct` itself is `min(log1p(power_mw) * 1.2, 15)`
  (see the electricity price pressure comment in `logic.py`), anchored at
  100MW≈+2%, 1000MW≈+8%, capped at 15% — and is independent of the
  per-category PUE/utilization split (see "PUE" above), since it's a
  function of `power_mw` alone. The original 75-facility dataset's powered
  facilities ranged 132-946MW, giving a 4.0-8.2% `price_lift_pct` range.
  [[trackpolicy-datacenters]]'s general-purpose facilities widen the full
  318-entry `power_mw` range to 5-11,000MW, which widens `price_lift_pct` to
  2.2-11.2% (median 6.0%, p25 5.2%, p75 6.8%) — but because the formula is
  logarithmic, the extra range mostly stretches the tails rather than
  shifting the bulk of the distribution, which stays clustered around the
  original 5-7% band. Re-checking the existing 5/6/7% thresholds against
  this wider distribution: low <5% (61 of 287 powered facilities),
  moderate 5-6% (70), high 6-7% (92), critical ≥7% (64) — still a
  reasonably even spread, so the thresholds were kept as-is rather than
  re-tuned. Facilities with no `power_mw` ("announced") always compute to a
  0% lift, which isn't a meaningful "low" signal, so they're excluded from
  severity scoring the same way they're excluded from the compare picker.

### Grid renewables severity thresholds (15 / 20 / 30% → critical/high/moderate/low, inverted scale)
- **Used in:** `renewable_severity` (`logic.py`, `carbon` block)
- **Status:** Internal heuristic, not externally sourced. Inverted relative
  to the other three-tier scales in this file: higher `renewable_pct` is
  *better*, so it maps to *lower* severity.
- **Context:** 66 of 75 facilities in the current dataset have no
  per-facility renewable mix data and fall back to the ~22% default (see
  "Default renewable percentage" below); the remaining facilities with real
  data range from 8% to 61%. With that shape, any threshold near the 22%
  default cluster puts most of the dataset in one bucket — this is expected
  given how little per-facility renewable data currently exists, not a
  flaw in the threshold choice. Thresholds (critical <15%, high 15-20%,
  moderate 20-30%, low ≥30%) were chosen so the default cluster reads as
  "moderate" (roughly tracking the national renewable-generation average
  the default itself approximates), while genuinely low (8%) and genuinely
  high (42%, 61%) real facilities are correctly flagged as critical/high
  and low respectively. As more per-facility `renewable_pct` data is added
  (see `fetch_data.py`), the distribution across buckets should become less
  default-cluster-dominated.

### Electricity price = $0.06/kWh — global default only
- **Used in:** `annual_cost_millions_usd` fallback when
  `electricity_price_usd_per_kwh` is missing from a record (`logic.py`)
- **Status:** Internal heuristic, not externally sourced.
- **Context:** This approximates a large commercial/industrial bulk rate,
  not the retail rate an average household pays. For reference, the
  [EIA reports the 2024 average US **residential** retail price at ~16.5¢/kWh](https://www.eia.gov/todayinenergy/detail.php?id=65244),
  roughly 2.7x this constant. Large data centers typically negotiate
  industrial/wholesale power contracts well below residential rates, but
  $0.06/kWh is not tied to a specific published industrial rate and should
  be treated as a rough planning estimate. This value is now only used as a
  fallback — see "Per-country electricity price" below for the primary
  source of this figure.

### Per-country electricity price (`IMPACT_RATES` in `fetch_data.py`)
- **Used in:** `electricity_price_usd_per_kwh` field on each data center
  record, read by `annual_cost_millions_usd` in `logic.py`
- **Status:** Internal heuristic per country, loosely anchored to published
  industrial electricity price data, not a per-country authoritative source.
- **Context:** Values are informally anchored to IEA/national-statistics
  industrial (not residential) electricity price ranges circa 2024, e.g.
  cheap-power/subsidized markets (Bahrain, United Arab Emirates, Malaysia,
  Norway) sit near $0.03-0.06/kWh, mid-range markets (United States, China,
  Japan) sit near $0.08-0.16/kWh, and expensive European markets (Germany,
  Italy, United Kingdom) sit near $0.17-0.25/kWh. These are directional
  planning estimates, not precise contracted industrial rates, which vary
  by contract and region within a country. Countries not in the table use
  the $0.06/kWh default above, unchanged from the prior global constant.

### Households equivalent (water) = daily_withdrawal_mgd / 300 gal/household/day
- **Used in:** `households_equivalent` (`logic.py`, `water` block)
- **Status:** Real source (EPA WaterSense), commonly-cited approximation.
- **Source:** [EPA WaterSense — Statistics and Facts](https://www.epa.gov/watersense/statistics-and-facts):
  the average US household uses about 300 gallons of water per day. Applied
  as `daily_withdrawal_mgd * 1,000,000 / 300` to translate a facility's daily
  water withdrawal into a "households'-worth of daily water use" figure,
  mirroring the cars/homes framing used for CO2 and electricity.

### Homes powered = annual_kwh / 10,500
- **Used in:** `homes_powered` (`logic.py:77`)
- **Status:** Real source (EIA).
- **Source:** [U.S. EIA — Electricity use in homes](https://www.eia.gov/energyexplained/use-of-energy/electricity-use-in-homes.php):
  average US household electricity consumption is commonly cited as
  ~10,500 kWh/year (EIA's most recent detailed figure, 2022 data, is
  10,791 kWh/year per residential customer — 10,500 is a close, slightly
  conservative rounding).

### Cars equivalent = annual_co2_tonnes / 4.6
- **Used in:** `cars_equivalent` (`logic.py:62`)
- **Status:** Real source (EPA).
- **Source:** [EPA — Greenhouse Gas Emissions from a Typical Passenger Vehicle](https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle):
  EPA's commonly cited figure is that a typical passenger vehicle emits
  about 4.6 metric tons of CO2 per year (assuming ~11,500 miles/year at
  ~22.2 mpg). Note: EPA's Greenhouse Gas Equivalencies Calculator has since
  updated its internal factor to ~4.29 t CO2e/vehicle/year in later
  revisions; 4.6 t is the older, still widely-cited figure.

### Default carbon intensity = 450 gCO2/kWh
- **Used in:** `carbon` fallback when `carbon_intensity_gco2_per_kwh` is missing (`logic.py:35`)
- **Status:** Internal heuristic, not externally sourced (conservative default).
- **Context:** EPA eGRID data puts the actual 2022 US national average grid
  carbon intensity at [~823 lbs CO2/MWh, i.e. ~373 gCO2/kWh](https://greencalculus.com/standards/epa-egrid/),
  trending slightly lower in eGRID2023 as the grid decarbonizes. This
  code's 450 gCO2/kWh default is deliberately conservative (higher than the
  national average) to avoid understating impact when a data center's
  actual grid mix is unknown, but it is not itself a published national
  average.

### Default renewable percentage = 25%
- **Used in:** `renewable_pct` fallback (`logic.py:36`)
- **Status:** Real source (EIA), close approximation.
- **Source:** [EIA — renewables provided 24.2% of US electricity generation in 2024](https://electrek.co/2025/02/27/renewables-generated-24-percent-us-electricity-2024-eia-data/),
  up from 23.2% in 2023. 25% is a reasonable rounded default reflecting the
  current national average when a facility's actual renewable mix is
  unknown.

### Cost allocation reform markup = 15% for facilities ≥100MW
- **Used in:** `effective_price` when `cost_allocation_reform` scenario
  override is set (`logic.py`, `compute_impact`).
- **Status:** Internal heuristic, not externally sourced.
- **Context:** Reflects real, recurring bill language (federal HB9655 "FAIR
  Data Act"; Michigan SB1047; New Jersey A796 and S731; North Carolina S730
  "Ratepayer Protection Act"; California SB1168 — all found via
  [trackpolicy.org's bill tracker](https://trackpolicy.org/bills), accessed
  2026-08-02) that requires utilities to bill large-load customers like data
  centers via a separate rate class or cost-recovery mechanism, rather than
  spreading grid-interconnection costs across all ratepayers. None of these
  bills specify a numeric surcharge — they establish the *mechanism*
  (separate rate class / cost-recovery rule), leaving the actual rate to
  utility commission proceedings. 15% is an internal planning estimate for
  "what a facility would pay if it fully bore its own interconnection cost
  instead of it being socialized," not a value taken from any specific
  tariff. The 100MW threshold reuses the existing electricity-price-lift
  formula's anchor (see "Grid price lift severity thresholds" above) as the
  point at which a facility's grid impact becomes large enough to be a
  plausible target for this kind of rate-class carve-out.

### Tax incentive rollback rates (`TAX_INCENTIVE_RATES` in `logic.py`)
- **Used in:** `effective_price` when `tax_incentive_rollback` scenario
  override is set (`logic.py`, `compute_impact`).
- **Status:** Internal heuristic per country, not externally sourced per
  facility or per country.
- **Context:** Reflects a real, recurring bill pattern — multiple
  Pennsylvania bills (HB2198, HB2532, SB1344) repeal the same data-center
  equipment sales-tax exemption program, and Ohio HB957 ends new sales tax
  exemptions for data centers outright (via
  [trackpolicy.org's bill tracker](https://trackpolicy.org/bills), accessed
  2026-08-02). No per-facility or even per-state tax abatement *value* is
  published anywhere in the source data (trackpolicy.org tracks bill text,
  not incentive dollar amounts; Epoch AI doesn't track incentives at all),
  so this models "how much would removing a typical abatement raise a
  facility's effective cost" as a rough per-country percentage uplift
  applied to electricity price, not a real fiscal estimate. 12% for the
  United States (where sales/property tax abatement programs for data
  centers are most widely reported) is the largest value in the table; other
  listed countries use progressively rounder, more speculative estimates.
  Countries outside the table use `DEFAULT_TAX_INCENTIVE_PCT` (8%).
  Treat this scenario's cost delta as illustrative of the *direction and
  rough scale* of a tax rollback, not a specific fiscal projection.

### Country land area (`COUNTRY_AREA_KM2` in `logic.py`)
- **Used in:** `region_area_km2()`, which powers the "per km²" normalized
  view in the region scorecard (`GET /api/regions` → `area_km2`). Not used
  by `compute_impact()` or any per-facility figure.
- **Status:** Real source (UN Statistics Division / World Bank "Surface
  area" series), not a heuristic.
- **Context:** Land area excluding inland water bodies, in km². Used to
  normalize a region's aggregate impact (e.g. total annual CO2) by the
  region's physical size, so a country with many facilities isn't
  automatically ranked highest purely from facility count. Covers the same
  country set as `GRID_DATA`/`IMPACT_RATES` in `fetch_data.py`; countries
  outside this table have no per-km² view (the scorecard falls back to
  per-facility or total).

### Grid renewables ranking (`COUNTRY_RENEWABLE_PCT` in `logic.py`)
- **Used in:** `grid_context()`, which powers the "greener than N of M
  tracked grids" comparison line in the facility detail panel.
- **Status:** Duplicates `GRID_DATA`'s `renewable_pct` values from
  `fetch_data.py` — same source/status as that table, not an independently
  derived figure. Kept as a separate table because `logic.py` (imported by
  the FastAPI app) must not import `fetch_data.py` (a standalone CLI
  script with network/CSV dependencies); if `GRID_DATA`'s renewable_pct
  values are updated, this table should be updated to match.
- **Context:** Covers the same ~33-country set `fetch_data.py` can geocode
  into, not just countries currently represented in `datacenters.json`, so
  ranking reflects the full tracked universe rather than whatever
  countries happen to have facilities today.

### Manually-researched locations (`backend/data/location_overrides.json`)
- **Used in:** `fetch_data.py` `main()` — checked per-record before the CSV
  `Address` field is geocoded; when a facility `id` has an entry in
  `location_overrides.json`, that entry's `address` string is geocoded
  first (with the CSV `Address` still available as a fallback tier if the
  override string itself fails to resolve).
- **Status:** Real sources (news coverage, company/government
  announcements), not a heuristic — but note the `geocode_precision`
  recorded per facility reflects what Nominatim actually resolved for the
  researched address string, which for many of these is city/region-level
  ("approximate"), not a confirmed street address ("address").
- **Context:** These are the 17 facilities that shipped at `"country"`
  geocode precision because the Epoch AI CSV's `Address` column was empty
  or contained a value Nominatim couldn't resolve, despite each facility's
  *name* already containing a real, findable location (e.g. "OpenAI
  Stargate New Mexico"). Each entry below was found via public reporting
  and verified to actually resolve via Nominatim before being added to
  `location_overrides.json` (accessed 2026-08-01):
  - **openai-stargate-new-mexico** — Santa Teresa, Doña Ana County, NM
    ("Project Jupiter"). [El Paso Matters](https://elpasomatters.org/2025/09/25/stargate-open-ai-oracle-project-jupiter-data-center-dona-ana-new-mexico-el-paso-texas/),
    [Doña Ana County](https://www.donaana.gov/about_us/project_jupiter.php).
  - **google-kansas-city-east** — 9501 NE Parvin Rd, Hunt Midwest Business
    Center, Kansas City, MO. [LoopNet listing](https://www.loopnet.com/Listing/9501-NE-Parvin-Rd-Kansas-City-MO/35605269/),
    [Baxtel](https://baxtel.com/data-center/google-kansas-city). "East"
    distinguishes this (earlier) site from Google's newer Northland
    campus; that distinction is an inference from chronology, not an
    official Google label found in sourcing.
  - **amazon-madison-mega-site** — Canton, Madison County, MS (off
    Nissan Parkway / Highway 22). [Mississippi Today](https://mississippitoday.org/2026/06/09/amazon-data-centers-mississippi/),
    [Canton Mississippi](https://www.canton-mississippi.com/aws-plans-10-billion-data-center-investment-in-mississippi-big-boost-for-tech/).
    Matches the CSV's existing address field; the business-park name in
    that string ("Madison Mega Site") is likely what kept it from
    resolving in Nominatim, so the override drops it and geocodes to
    the city instead.
  - **meta-kuna** — 6990 W Kuna-Mora Rd, Kuna, ID. [DataCenterMap](https://www.datacentermap.com/usa/idaho/boise/meta-kuna-data-center/),
    [Idaho Commerce](https://commerce.idaho.gov/press-releases/meta-announces-kuna-as-location-of-new-data-center/).
    The CSV's existing address uses house number 601; multiple
    independent sources converge on 6990 instead, which is what's used
    here.
  - **google-storey-county** — 7400 USA Pkwy, Tahoe Reno Industrial
    Center, Storey County, NV. [DataCenterMap](https://www.datacentermap.com/usa/nevada/reno/google-storey-county/),
    [Google Data Centers](https://datacenters.google/locations/storey-county-nevada/).
  - **google-mesa** — East Elliot Road / Sossaman Road, Mesa, AZ (187-acre
    campus). [AZBEX](https://azbex.com/planning-development/google-planning-next-phase-of-mesa-data-center-facility/),
    [DataCenterMap](https://www.datacentermap.com/usa/arizona/phoenix/google-mesa-campus/).
  - **huawei-horinger** — Horinger New Area, Hohhot, Inner Mongolia, China
    (city/district-level; no public street address found).
    [China Daily](http://regional.chinadaily.com.cn/hohhot/2023-10/11/c_930029.htm),
    [Xinhua](https://english.news.cn/20231129/fb14f64feea8471083033d1adc5f37b7/c.html).
  - **vnet-bayin-ulanqab** — Ulanqab, Inner Mongolia, China (city-level
    only; "Bayin" from the CSV's existing address could not be verified
    as a real sub-location in Ulanqab, so it's dropped from the override).
    [Datacenters.com](https://www.datacenters.com/vnet-group-inc-ulanqab).
  - **oracle-batam** — Nongsa Digital Park, Batam, Riau Islands, Indonesia
    (Oracle leases DayOne's facility there as sole tenant).
    [DataCenterDynamics](https://www.datacenterdynamics.com/en/news/oracle-considers-indonesian-cloud-region-in-batam-report/),
    [Bloomberg](https://www.bloomberg.com/news/articles/2025-03-14/oracle-said-to-weigh-data-center-on-indonesia-s-batam-island).
  - **google-papillion** — 14706 Schram Rd, Papillion, NE. [DataCenterMap](https://www.datacentermap.com/usa/nebraska/papillion/google-papillion/),
    [Journal Star](https://journalstar.com/business/local/google-to-build-600-million-data-center-in-papillion/article_bfb56f35-f1dc-51e8-9153-c2afbf813c15.html).
    This differs from the CSV's existing address ("Gold Coast Rd"); Schram
    Road is corroborated by multiple independent directory sources and is
    used here, but should be cross-checked against Google's own site
    listing if that becomes available.
  - **start-campus-sines-data-campus** — Sines, Setúbal District, Portugal
    (ZILS industrial/logistics zone). [Start Campus](https://www.startcampus.pt/sines),
    [Open Compute Project](https://www.opencompute.org/facilities/74/start-campus-sines-12gw-data-campus-sin02).
    The CSV's existing address includes the company name prefix
    ("Start Campus - Sustainable Data Center Services,"), which is likely
    what kept it from resolving; the override drops it.
  - **openai-stargate-michigan** — Saline Township, Washtenaw County, MI
    ("The Barn" campus). [DataCenterDynamics](https://www.datacenterdynamics.com/en/news/oracle-and-openai-start-construction-on-stargate-data-center-campus-in-saline-township-michigan/),
    [Related Digital](https://www.related.com/press-releases/2025-10-30/openai-oracle-and-related-digital-announce-stargate-data-center-site).
  - **openai-stargate-milam** — Cameron, Milam County, TX ("Freebird"
    campus, ~70 mi NE of Austin). [KVUE](https://www.kvue.com/article/news/local/milam-county-openai-data-center/269-3a70f4ee-3ab8-426a-8174-d5fa121ebdf8),
    [DataCenterMap](https://www.datacentermap.com/usa/texas/cameron/stargate-milam-county/).
    Confirms "Milam" in the facility name refers to Milam County, TX (not,
    e.g., a Milam elsewhere) — a bare "Cameron, Texas" query without the
    county qualifier incorrectly resolves to Cameron County near the
    Mexican border, ~500km away, so the county qualifier is required here.
  - **openai-stargate-uae** — Abu Dhabi, UAE (10-sq-mi "UAE-US AI Campus,"
    developed by G42's Khazna Data Centres; no verified street address).
    [TechRepublic](https://www.techrepublic.com/article/news-stargate-uae-openai-ai-data-center/),
    [Gulf News](https://gulfnews.com/business/markets/uae-openai-will-build-massive-stargate-ai-center-in-abu-dhabi-1.500136990).
    The CSV's existing address ("Nexus L&T Project Office, Al Bihouth, Al
    Dhafrah") could not be independently corroborated, so the override
    falls back to city-level rather than keeping an unverified string.
  - **openai-stargate-wisconsin** — Port Washington, Ozaukee County, WI
    ("Lighthouse" campus). [Vantage Data Centers](https://vantage-dc.com/news/openai-oracle-and-vantage-data-centers-announce-stargate-data-center-site-in-wisconsin/),
    [Ozaukee Press](https://www.ozaukeepress.com/content/openai-oracle-run-stargate-port-data-center).
  - **southgate-melbourne** — Melbourne, Victoria, Australia (Project
    Southgate, Firmus/Nvidia/CDC Data Centres partnership; the specific
    campus within Melbourne is not confirmed in sourcing, so city-level is
    used rather than asserting a specific suburb).
    [DataCenterDynamics](https://www.datacenterdynamics.com/en/news/ai-cloud-firm-partners-with-cdc-for-australian-data-center-capacity/),
    [Firmus](https://firmus.co/newsroom/southgate-expansion).
  - **dayone-nusajaya** — Nusajaya Tech Park, Iskandar Puteri, Johor
    Bahru, Malaysia. [DataCenterMap](https://www.datacentermap.com/malaysia/johor-bahru/gds-nusajaya-tech-park-campus/),
    [DayOne Data Centers](https://dayonedc.com/market/johor).

  All 17 facilities above now resolve to real city/region or street-level
  locations rather than the jittered country centroid. No facility from
  the original 17 was left at country-level precision — every one had at
  least a city/region publicly reported.

---

## Verification checklist

Every numeric constant referenced in `compute_impact()` is covered above:

- [x] Utilization factor (80% frontier-ai / 65% general-purpose, per-category)
- [x] PUE (1.3 frontier-ai / 1.56 general-purpose, per-category)
- [x] 10 kW/m² IT density
- [x] 3.0 L/kWh blended water estimate (global default)
- [x] Per-country water intensity (`IMPACT_RATES`)
- [x] Water severity thresholds (1 / 2.5 / 5 MGD)
- [x] $0.06/kWh electricity price (global default)
- [x] Per-country electricity price (`IMPACT_RATES`)
- [x] 10,500 kWh/home/year
- [x] 300 gal/household/day (water households equivalent)
- [x] 4.6 tonnes CO2/car/year
- [x] 450 gCO2/kWh default carbon intensity
- [x] 25% default renewable percentage
- [x] Cost allocation reform markup (15% at ≥100MW)
- [x] Tax incentive rollback rates (`TAX_INCENTIVE_RATES`)
