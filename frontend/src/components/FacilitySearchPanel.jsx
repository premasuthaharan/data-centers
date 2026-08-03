import { useState, useMemo } from "react";
import { searchFacilities } from "../utils/facilitySearch";

const SORTS = {
  name: { label: "Name", compare: (a, b) => a.name.localeCompare(b.name) },
  power: {
    label: "Power",
    // Facilities with unknown power_mw ("announced" status) sort last
    // rather than colliding with real 0-adjacent values.
    compare: (a, b) => (b.power_mw ?? -1) - (a.power_mw ?? -1),
  },
};

// Standalone "find a facility by name/operator" panel, distinct from
// NearMePanel's "what's near me" — triggered from its own button in
// App.jsx and dismissed the same way CompareModal's search dropdown is:
// select a result, click the close button, or click outside.
export default function FacilitySearchPanel({ datacenters, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [countryFilter, setCountryFilter] = useState("all");

  const countries = useMemo(
    () => [...new Set(datacenters.map((dc) => dc.country).filter(Boolean))].sort(),
    [datacenters]
  );

  const results = useMemo(() => {
    const scoped =
      countryFilter === "all" ? datacenters : datacenters.filter((dc) => dc.country === countryFilter);
    const matched = searchFacilities(scoped, query);
    return [...matched].sort(SORTS[sortKey].compare);
  }, [datacenters, query, sortKey, countryFilter]);

  return (
    <div className="facility-search-overlay" onClick={onClose}>
      <div className="facility-search-card" onClick={(e) => e.stopPropagation()}>
        <div className="facility-search-header">
          <span>Find a facility</span>
          <button className="facility-search-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <input
          type="text"
          className="facility-search-input"
          placeholder="Search by name or operator…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="facility-search-controls">
          <div className="facility-search-sort" role="group" aria-label="Sort results">
            {Object.entries(SORTS).map(([key, { label }]) => (
              <button
                key={key}
                type="button"
                className={"facility-search-sort-btn" + (sortKey === key ? " facility-search-sort-btn--active" : "")}
                onClick={() => setSortKey(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            className="facility-search-country-filter"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            aria-label="Filter by country"
          >
            <option value="all">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <ul className="facility-search-results">
          {results.map((dc) => (
            <li key={dc.id}>
              <button
                type="button"
                className="facility-search-result-btn"
                onClick={() => onSelect(dc.id)}
              >
                <span className="facility-search-result-name">{dc.name}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="facility-search-empty">No matching facilities.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
