import { useState, useEffect, useMemo, useCallback } from "react";
import { fmt } from "./formatters";
import { waterSeverityColor } from "./mapHelpers";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const METRICS = [
  { id: "annual_co2_tonnes", label: "CO₂", unit: "t", format: (n) => fmt(n, "t", 0) },
  { id: "daily_withdrawal_mgd", label: "Water", unit: "MGD", format: (n) => fmt(n, "MGD", 2) },
  { id: "annual_kwh", label: "Power", unit: "TWh", format: (n) => fmt(n / 1e9, "TWh", 1) },
];

// "Per km²" is the default: it normalizes each region's total impact by the
// country's land area, so a country isn't ranked #1 purely because it has
// the most facilities (see logic.COUNTRY_AREA_KM2). Regions with no known
// area are excluded from that basis rather than shown with a misleading 0.
const BASES = [
  { id: "area", label: "Per km²" },
  { id: "facility", label: "Per facility" },
  { id: "total", label: "Total" },
];

function dominantWaterSeverity(counts) {
  const order = ["critical", "high", "moderate", "low"];
  return order.find((severity) => counts[severity] > 0) ?? "low";
}

function basisValue(region, metricId, basisId) {
  const total = region[metricId];
  if (basisId === "facility") return total / region.facility_count;
  if (basisId === "area") return region.area_km2 ? total / region.area_km2 : null;
  return total;
}

export default function RegionScorecard({ onClose, onFocusRegion }) {
  const [status, setStatus] = useState("loading"); // loading | error | done
  const [error, setError] = useState(null);
  const [regions, setRegions] = useState([]);
  const [metricId, setMetricId] = useState(METRICS[0].id);
  const [basisId, setBasisId] = useState(BASES[0].id);

  useEffect(() => {
    fetch(`${API}/api/regions`)
      .then((r) => r.json())
      .then((data) => {
        setRegions(data);
        setStatus("done");
      })
      .catch((e) => {
        setError(e.message);
        setStatus("error");
      });
  }, []);

  const metric = METRICS.find((m) => m.id === metricId);

  const ranked = useMemo(() => {
    return regions
      .map((region) => ({ region, value: basisValue(region, metricId, basisId) }))
      .filter(({ value }) => value != null)
      .sort((a, b) => b.value - a.value);
  }, [regions, metricId, basisId]);

  const handleFocus = useCallback(
    (region) => onFocusRegion?.(region),
    [onFocusRegion]
  );

  const formatValue = (value) => {
    if (basisId === "total") return metric.format(value);
    // Per-facility / per-km² values are much smaller than the totals these
    // units were chosen for (MGD, TWh) — e.g. water withdrawal per km² is
    // routinely << 0.01 MGD, which rounds to "0" at 2 decimals. Switch to a
    // smaller unit for these bases so a real, readable number shows. Always
    // pass a fixed decimal count so every row in the list lines up (a value
    // that happens to round to a whole number must still show ".00", or a
    // reader can misparse "1,016,884.67" vs "1,268,168" as different
    // magnitudes rather than both being ~1.2M).
    if (metricId === "annual_kwh") return fmt(value / 1e6, "MWh", 2);
    if (metricId === "daily_withdrawal_mgd") return fmt(value * 1_000_000, "gal/day", 0);
    return fmt(value, metric.unit, 2);
  };

  return (
    <div className="scenario-panel">
      <button className="dc-close-btn" onClick={onClose} aria-label="Close">✕</button>

      <div className="scenario-panel-header">
        <div className="scenario-panel-title">Region Scorecard</div>
        <p className="scenario-panel-subtitle">
          Aggregate impact by country, ranked by the metric and basis below.
        </p>
      </div>

      <div className="region-metric-switcher">
        {METRICS.map((m) => (
          <button
            key={m.id}
            className={"region-metric-btn" + (m.id === metricId ? " region-metric-btn--active" : "")}
            onClick={() => setMetricId(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="region-basis-switcher">
        {BASES.map((b) => (
          <button
            key={b.id}
            className={"region-basis-btn" + (b.id === basisId ? " region-basis-btn--active" : "")}
            onClick={() => setBasisId(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {status === "loading" && <div className="scenario-status">Loading regions…</div>}
      {status === "error" && <div className="scenario-status scenario-status--error">⚠ {error}</div>}

      {status === "done" && (
        <ul className="near-me-list">
          {ranked.map(({ region, value }, i) => {
            const severity = dominantWaterSeverity(region.water_severity_counts);
            return (
              <li key={region.region} className="near-me-item">
                <button className="near-me-item-btn" onClick={() => handleFocus(region)}>
                  <div className="near-me-item-top">
                    <span className="near-me-item-name">
                      #{i + 1} {region.region}
                    </span>
                    <span className="near-me-item-distance">
                      {region.facility_count} facilit{region.facility_count === 1 ? "y" : "ies"}
                    </span>
                  </div>
                  <div className="near-me-item-stats">
                    <span>
                      {metric.label} <strong>{formatValue(value)}</strong>
                    </span>
                    {metricId === "daily_withdrawal_mgd" && (
                      <span style={{ color: waterSeverityColor(severity) }}>
                        Water stress: <strong>{severity}</strong>
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {status === "done" && basisId === "area" && ranked.length < regions.length && (
        <p className="impact-note region-scorecard-footnote">
          {regions.length - ranked.length} region(s) omitted — land area not
          available for this basis.
        </p>
      )}
    </div>
  );
}
