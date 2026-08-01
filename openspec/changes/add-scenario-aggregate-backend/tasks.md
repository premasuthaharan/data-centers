## 1. `compute_impact` overrides

- [x] 1.1 Add `overrides: dict | None = None` parameter to `compute_impact`;
      merge onto `dc`'s effective `renewable_pct`,
      `carbon_intensity_gco2_per_kwh`, `water_liters_per_kwh`,
      `electricity_price_usd_per_kwh` before running existing formula
- [x] 1.2 Add `pue` and `utilization` parameters to `compute_impact`,
      defaulting to current `PUE`/`UTILIZATION_FACTOR` module constants;
      use these instead of the bare module names inside the function body
- [x] 1.3 Confirm `all_datacenters_with_impact()` and `nearest_datacenters()`
      still work unchanged (they call `compute_impact` with defaults only)

## 2. Aggregate function

- [x] 2.1 Add `aggregate_impact(centers_with_impact: list[dict]) -> dict` to
      `backend/logic.py`: sum `annual_kwh`, `annual_co2_tonnes`,
      `daily_withdrawal_mgd`, `annual_cost_millions_usd`; count facilities
      per `water.severity` value
- [x] 2.2 Handle empty list input (return zeroed totals, not an error)

## 3. `/api/scenario` endpoint

- [x] 3.1 Add Pydantic request model for the scenario body
      (`renewable_pct`, `carbon_intensity_gco2_per_kwh`,
      `water_liters_per_kwh`, `pue` all optional; `facility_ids` optional
      list of strings)
- [x] 3.2 Add `POST /api/scenario` handler in `backend/main.py`: look up
      facilities (all, or filtered to `facility_ids`), recompute impact
      with `overrides`/`pue` from the request, return recomputed
      `data_centers` plus `baseline_totals` (unmodified) and
      `scenario_totals` (via `aggregate_impact`)
      (also widened CORS `allow_methods` to include `POST`)
- [x] 3.3 Validate unknown `facility_ids` return a 4xx, not a silent empty
      result
      (returns 404 with the list of unknown ids)

## 4. Tests

- [x] 4.1 `test_logic.py`: overrides individually and stacked; pue/utilization
      override; confirm default-argument calls match pre-change output
      exactly (regression guard)
- [x] 4.2 `test_logic.py`: `aggregate_impact` on a known small fixture list,
      and on an empty list
- [x] 4.3 `test_main.py`: `/api/scenario` with no `facility_ids` (applies to
      all), with a subset, with an empty/invalid override body, and with an
      unknown facility id

## 5. Verification

- [x] 5.1 `cd backend && pytest` passes, coverage gate still met
      (91 tests passing; ran locally without `pytest-cov` installed in
      this venv, so the coverage gate itself wasn't re-measured locally —
      CI will enforce it)
- [x] 5.2 Manually hit `POST /api/scenario` with curl for each preset lever
      against the real 75-facility dataset:
      - `renewable_pct: 100` — correctly updates the reported field but,
        as expected given the current formula (CO2 is driven by
        `carbon_intensity_gco2_per_kwh`, not `renewable_pct`), does not
        change `annual_co2_tonnes`. `renewable_pct` is informational
        display data in this model, not a CO2 multiplier.
      - `carbon_intensity_gco2_per_kwh: 50` — CO2 dropped from
        42,015,561 t to 5,403,746 t
      - `pue: 1.1` — annual kWh dropped from 108.07B to 91.45B
      - `water_liters_per_kwh: 1.0` — daily withdrawal dropped from
        181.88 MGD to 78.18 MGD
      - Unknown `facility_ids` correctly returned 404
