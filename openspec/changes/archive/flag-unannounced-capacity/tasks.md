## 1. Data generation
- [x] 1.1 In `fetch_data.py`, set `data_status = "confirmed"` if the source
      CSV has a nonzero power figure, else `"announced"`
- [x] 1.2 Regenerate `datacenters.json` with the new field on all 43
      entries
      (backfilled `data_status` in place rather than re-running the network
      fetch/geocode pipeline; existing lat/lng/power figures were untouched)

## 2. Backend
- [x] 2.1 Pass `data_status` through unchanged in `compute_impact()`'s
      returned dict (top-level, alongside `radius_km`, `electricity`, etc.)
- [x] 2.2 Decide and document behavior for `impact_radius_km` when status is
      `"announced"` (currently defaults to 20km flat — confirm this is
      still the desired placeholder radius)
      (kept the flat 20km placeholder; documented the rationale in a comment
      in `logic.py`)

## 3. Frontend
- [x] 3.1 In `DataCenterCard.jsx`, when `data_status === "announced"`,
      replace numeric metrics (homes powered, cost, water MGD, etc.) with a
      "capacity not yet announced" message instead of showing zeros
- [x] 3.2 In `Map.jsx`, style `"announced"` markers distinctly (e.g. muted
      color/opacity) from confirmed facilities
- [x] 3.3 Add a legend entry explaining the distinction

## 4. Verification
- [x] 4.1 Confirm all 15 previously-zero entries now show `"announced"` and
      render without misleading zero-value stats
      (actual count was 17 of 43, not 15 — verified via `logic.py` and in
      a live browser session)
- [x] 4.2 Confirm confirmed facilities are unaffected
      (verified full impact stats still render normally, e.g.
      Anthropic-Amazon New Carlisle)
