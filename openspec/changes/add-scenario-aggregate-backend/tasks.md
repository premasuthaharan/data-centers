## 1. `compute_impact` overrides

- [ ] 1.1 Add `overrides: dict | None = None` parameter to `compute_impact`;
      merge onto `dc`'s effective `renewable_pct`,
      `carbon_intensity_gco2_per_kwh`, `water_liters_per_kwh`,
      `electricity_price_usd_per_kwh` before running existing formula
- [ ] 1.2 Add `pue` and `utilization` parameters to `compute_impact`,
      defaulting to current `PUE`/`UTILIZATION_FACTOR` module constants;
      use these instead of the bare module names inside the function body
- [ ] 1.3 Confirm `all_datacenters_with_impact()` and `nearest_datacenters()`
      still work unchanged (they call `compute_impact` with defaults only)

## 2. Aggregate function

- [ ] 2.1 Add `aggregate_impact(centers_with_impact: list[dict]) -> dict` to
      `backend/logic.py`: sum `annual_kwh`, `annual_co2_tonnes`,
      `daily_withdrawal_mgd`, `annual_cost_millions_usd`; count facilities
      per `water.severity` value
- [ ] 2.2 Handle empty list input (return zeroed totals, not an error)

## 3. `/api/scenario` endpoint

- [ ] 3.1 Add Pydantic request model for the scenario body
      (`renewable_pct`, `carbon_intensity_gco2_per_kwh`,
      `water_liters_per_kwh`, `pue` all optional; `facility_ids` optional
      list of strings)
- [ ] 3.2 Add `POST /api/scenario` handler in `backend/main.py`: look up
      facilities (all, or filtered to `facility_ids`), recompute impact
      with `overrides`/`pue` from the request, return recomputed
      `data_centers` plus `baseline_totals` (unmodified) and
      `scenario_totals` (via `aggregate_impact`)
- [ ] 3.3 Validate unknown `facility_ids` return a 4xx, not a silent empty
      result

## 4. Tests

- [ ] 4.1 `test_logic.py`: overrides individually and stacked; pue/utilization
      override; confirm default-argument calls match pre-change output
      exactly (regression guard)
- [ ] 4.2 `test_logic.py`: `aggregate_impact` on a known small fixture list,
      and on an empty list
- [ ] 4.3 `test_main.py`: `/api/scenario` with no `facility_ids` (applies to
      all), with a subset, with an empty/invalid override body, and with an
      unknown facility id

## 5. Verification

- [ ] 5.1 `cd backend && pytest` passes, coverage gate still met
- [ ] 5.2 Manually hit `POST /api/scenario` with curl/httpie for a
      "100% renewable" scenario and confirm `scenario_totals.annual_co2_tonnes`
      drops relative to `baseline_totals`
