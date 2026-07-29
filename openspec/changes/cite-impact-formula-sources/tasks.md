## 1. Research
- [x] 1.1 Find a source (or confirm none exists) for: PUE 1.3 assumption,
      10 kW/m² IT density, 3.0 L/kWh blended water estimate, water severity
      thresholds ("US EPA baseline"), $0.06/kWh electricity price, 10,500
      kWh/home/year, 4.6 tonnes CO2/car/year, 450 gCO2/kWh and 25%
      renewable defaults
- [x] 1.2 For any constant with no real authoritative source, explicitly
      label it in `SOURCES.md` as "internal heuristic, not externally
      sourced" rather than implying it's authoritative

## 2. Documentation
- [x] 2.1 Create `backend/SOURCES.md` listing each constant, its value,
      where it's used (function/line), and its citation or heuristic label
- [x] 2.2 Update the inline comments in `logic.py` (lines ~40-68) to
      reference `SOURCES.md` by name rather than making standalone claims

## 3. Verification
- [x] 3.1 Confirm every numeric constant in `compute_impact()` has a
      corresponding entry in `SOURCES.md`
