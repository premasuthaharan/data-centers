## Why

`logic.py`'s comments make claims like "Severity label anchored to US EPA
baseline thresholds" and "Typical cooling: 1.8L per kWh for air-cooled, up to
7L for evaporative towers" without linking to any document. Every constant
in the file (PUE 1.3, 10kW/m² density, 4.6t CO2/car, 10,500 kWh/home) is
presented as fact but is unsourced in the repo. This undermines the tool's
credibility — anyone auditing the numbers has no way to verify or challenge
them.

## What Changes

- Add a `SOURCES.md` file documenting, for every constant used in
  `compute_impact()`: the value, what it's used for, and a link/citation to
  a real source (EPA, EIA, IEA, published PUE surveys, etc.) or an explicit
  note that it's an estimate/heuristic if no authoritative source exists.
- Update the inline comments in `logic.py` to reference `SOURCES.md` instead
  of making unlinked claims.

## Impact

- Affected code: new `backend/SOURCES.md` (or repo-root `SOURCES.md`),
  comment updates in `backend/logic.py`. No behavior/formula changes in
  this proposal — purely documentation. Formula changes are covered by
  [[localize-impact-constants]] and [[adjust-utilization-assumption]].
