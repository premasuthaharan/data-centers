import { useState, useMemo } from "react";
import { fmt } from "./formatters";

const WATER_SEVERITY_RANK = { low: 0, moderate: 1, high: 2, critical: 3 };

// rawGet feeds the per-row best/worst comparison; lowerIsBetter picks the
// direction ("more renewables" is better, "more CO2" is worse). Rows
// without rawGet skip highlighting entirely: Operator isn't comparable,
// and Power is deliberately left neutral — facility size isn't "worse."
const ROWS = [
  { label: "Operator", get: (dc) => dc.operator ?? "—" },
  { label: "Power", get: (dc) => (dc.power_mw ? `${dc.power_mw.toLocaleString()} MW` : "—") },
  {
    label: "Annual electricity",
    get: (dc) => `${(dc.impact.electricity.annual_kwh / 1e9).toFixed(1)} TWh`,
    rawGet: (dc) => dc.impact.electricity.annual_kwh,
    lowerIsBetter: true,
  },
  {
    label: "Grid price lift",
    get: (dc) => `+${dc.impact.electricity.price_lift_pct}%`,
    rawGet: (dc) => dc.impact.electricity.price_lift_pct,
    lowerIsBetter: true,
  },
  {
    label: "Annual CO₂",
    get: (dc) => fmt(dc.impact.carbon.annual_co2_tonnes, "t"),
    rawGet: (dc) => dc.impact.carbon.annual_co2_tonnes,
    lowerIsBetter: true,
  },
  {
    label: "Grid renewables",
    get: (dc) => `${dc.impact.carbon.renewable_pct}%`,
    rawGet: (dc) => dc.impact.carbon.renewable_pct,
    lowerIsBetter: false,
  },
  {
    label: "Water withdrawal",
    get: (dc) => fmt(dc.impact.water.daily_withdrawal_mgd, "MGD"),
    rawGet: (dc) => dc.impact.water.daily_withdrawal_mgd,
    lowerIsBetter: true,
  },
  {
    label: "Water severity",
    get: (dc) => dc.impact.water.severity ?? "—",
    rawGet: (dc) => WATER_SEVERITY_RANK[dc.impact.water.severity] ?? 0,
    lowerIsBetter: true,
  },
  {
    label: "Waste heat",
    get: (dc) => fmt(dc.impact.land.waste_heat_mw, "MW"),
    rawGet: (dc) => dc.impact.land.waste_heat_mw,
    lowerIsBetter: true,
  },
];

// Best cell gets a "▾ better" marker, worst gets "▴ worse" — only when the
// row is comparable (rawGet defined) and values actually differ, so an
// all-tied row (e.g. every facility at the same 22% country renewable
// average) doesn't get an arbitrary winner.
function rowMarkers(row, selected) {
  if (!row.rawGet) return new Map();
  const values = selected.map((dc) => row.rawGet(dc));
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return new Map();
  const bestVal = row.lowerIsBetter ? min : max;
  const worstVal = row.lowerIsBetter ? max : min;
  const markers = new Map();
  selected.forEach((dc, i) => {
    if (values[i] === bestVal) markers.set(dc.id, "best");
    else if (values[i] === worstVal) markers.set(dc.id, "worst");
  });
  return markers;
}

export default function CompareModal({ datacenters, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const comparable = useMemo(
    () => datacenters.filter((dc) => dc.impact && (dc.data_status ?? dc.impact.data_status) !== "announced"),
    [datacenters]
  );

  const selected = comparable.filter((dc) => selectedIds.includes(dc.id));

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return comparable.filter((dc) => {
      if (selectedIds.includes(dc.id)) return false;
      if (!q) return true;
      return dc.name.toLowerCase().includes(q) || (dc.operator ?? "").toLowerCase().includes(q);
    });
  }, [comparable, selectedIds, query]);

  const add = (id) => {
    setSelectedIds((prev) => [...prev, id]);
    setQuery("");
  };

  const remove = (id) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  return (
    <div className="compare-modal-overlay" onClick={onClose}>
      <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
        <button className="dc-close-btn" onClick={onClose} aria-label="Close">✕</button>
        <div className="compare-modal-title">Compare Facilities</div>

        <div className="compare-picker">
          {selected.length > 0 && (
            <div className="compare-chip-list">
              {selected.map((dc) => (
                <span key={dc.id} className="compare-chip">
                  {dc.name}
                  <button
                    type="button"
                    className="compare-chip-remove"
                    onClick={() => remove(dc.id)}
                    aria-label={`Remove ${dc.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            className="compare-search-input"
            placeholder="Search facilities by name or operator…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
          />

          {(isSearchFocused || query.trim()) && (
            <ul className="compare-search-results">
              {searchResults.map((dc) => (
                <li key={dc.id}>
                  <button
                    type="button"
                    className="compare-search-result-btn"
                    onClick={() => add(dc.id)}
                  >
                    <span className="compare-search-result-name">{dc.name}</span>
                    <span className="compare-search-result-operator">{dc.operator ?? "—"}</span>
                  </button>
                </li>
              ))}
              {searchResults.length === 0 && (
                <li className="compare-search-empty">No matching facilities.</li>
              )}
            </ul>
          )}
        </div>

        {selected.length >= 2 ? (
          <div className="compare-table-wrapper">
            <table className="compare-table">
              <thead>
                <tr>
                  <th></th>
                  {selected.map((dc) => (
                    <th key={dc.id}>{dc.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const markers = rowMarkers(row, selected);
                  return (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      {selected.map((dc) => {
                        const marker = markers.get(dc.id);
                        return (
                          <td
                            key={dc.id}
                            className={marker ? `compare-cell--${marker}` : undefined}
                          >
                            {marker === "best" && <span className="compare-cell-marker" aria-label="Best">▾ </span>}
                            {marker === "worst" && <span className="compare-cell-marker" aria-label="Worst">▴ </span>}
                            {row.get(dc)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="compare-hint">Select at least 2 facilities to compare.</p>
        )}
      </div>
    </div>
  );
}
