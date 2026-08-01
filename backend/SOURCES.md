# Sources for constants in `logic.py`

This document lists every numeric constant used in `compute_impact()`
(`logic.py`), what it's used for, and where the value comes from. Where no
authoritative source exists, the constant is explicitly labeled as an
internal heuristic rather than implied to be industry fact.

---

### Utilization factor = 80% of nameplate power
- **Used in:** `annual_kwh = power_mw * UTILIZATION_FACTOR * PUE * 1_000 * 8_760` (`logic.py`)
- **Status:** Internal heuristic, not externally sourced.
- **Context:** `power_mw` (Epoch AI's "Current power") is nameplate IT
  capacity; real facilities don't draw 100% of nameplate continuously.
  70-90% is a commonly cited range for average utilization in data center
  capacity planning; 80% is the midpoint, chosen as a single representative
  planning estimate rather than a measured fleet average. This is applied
  uniformly across all facilities — it does not model per-facility or
  per-workload variation (e.g. AI training clusters may run closer to
  continuous full load than typical enterprise deployments).

### PUE (Power Usage Effectiveness) = 1.3
- **Used in:**
  - `annual_kwh = power_mw * UTILIZATION_FACTOR * PUE * 1_000 * 8_760` (`logic.py`) —
    total facility draw (IT load + cooling/other overhead), not just IT load.
  - `waste_heat_mw = power_mw * (PUE - 1)` (`logic.py`)
  - Both read from the single `PUE` constant in `logic.py` so the electricity
    total and the waste-heat estimate stay consistent with each other; prior
    to this, `annual_kwh` ignored PUE entirely (treating `power_mw` as if it
    were already total facility draw) while `waste_heat_mw` assumed it was
    IT-only load — the two were internally contradictory.
- **Status:** Internal heuristic, not externally sourced.
- **Context:** The most recent industry-wide figure is the
  [Uptime Institute Global Data Center Survey 2024](https://uptimeinstitute.com/uptime_assets/7425ec68d479c5d78a743df94a79b114ed9f9c73f13b6460949d2b8e73373209-GA-2024-07-uptime-institute-global-data-center-survey-results-2024.pdf),
  which reports an average PUE of **1.56** (1.47 when capacity-weighted
  toward larger, newer facilities). Our 1.3 is more optimistic than the
  reported average — it approximates a modern, efficient facility rather
  than a typical one. Treat `waste_heat_mw` and the PUE-inflated portion of
  `annual_kwh` as best-case estimates, not a fleet average.

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

### Water severity thresholds (1 / 5 / 15 MGD → low/moderate/high/critical)
- **Used in:** `water_severity` (`logic.py:51-58`)
- **Status:** Internal heuristic, not externally sourced. **No EPA baseline
  for these specific thresholds was found.** The previous comment claiming
  "US EPA baseline thresholds" was inaccurate and has been removed.
- **Context:** EPA and USGS publish water withdrawal *permit* thresholds
  (e.g., 100,000 gallons/day triggers permitting in some states) and
  regional water-stress indicators, but no EPA source ties specific
  facility withdrawal volumes (in MGD) to "low/moderate/high/critical"
  labels. These bucket boundaries were chosen internally to spread
  observed data center withdrawal volumes (enterprise sites: ~0.3-0.5 MGD;
  hyperscale sites: ~1-5 MGD, with some individual facilities reported
  above 2-4 MGD) across a readable severity scale.

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

---

## Verification checklist

Every numeric constant referenced in `compute_impact()` is covered above:

- [x] 80% utilization factor
- [x] PUE 1.3
- [x] 10 kW/m² IT density
- [x] 3.0 L/kWh blended water estimate (global default)
- [x] Per-country water intensity (`IMPACT_RATES`)
- [x] Water severity thresholds (1 / 5 / 15 MGD)
- [x] $0.06/kWh electricity price (global default)
- [x] Per-country electricity price (`IMPACT_RATES`)
- [x] 10,500 kWh/home/year
- [x] 300 gal/household/day (water households equivalent)
- [x] 4.6 tonnes CO2/car/year
- [x] 450 gCO2/kWh default carbon intensity
- [x] 25% default renewable percentage
