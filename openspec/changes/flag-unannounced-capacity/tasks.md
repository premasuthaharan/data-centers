## 1. Data generation
- [ ] 1.1 In `fetch_data.py`, set `data_status = "confirmed"` if the source
      CSV has a nonzero power figure, else `"announced"`
- [ ] 1.2 Regenerate `datacenters.json` with the new field on all 43
      entries

## 2. Backend
- [ ] 2.1 Pass `data_status` through unchanged in `compute_impact()`'s
      returned dict (top-level, alongside `radius_km`, `electricity`, etc.)
- [ ] 2.2 Decide and document behavior for `impact_radius_km` when status is
      `"announced"` (currently defaults to 20km flat — confirm this is
      still the desired placeholder radius)

## 3. Frontend
- [ ] 3.1 In `DataCenterCard.jsx`, when `data_status === "announced"`,
      replace numeric metrics (homes powered, cost, water MGD, etc.) with a
      "capacity not yet announced" message instead of showing zeros
- [ ] 3.2 In `Map.jsx`, style `"announced"` markers distinctly (e.g. muted
      color/opacity) from confirmed facilities
- [ ] 3.3 Add a legend entry explaining the distinction

## 4. Verification
- [ ] 4.1 Confirm all 15 previously-zero entries now show `"announced"` and
      render without misleading zero-value stats
- [ ] 4.2 Confirm confirmed facilities are unaffected
