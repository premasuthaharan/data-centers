import { useState, useMemo } from "react";
import { searchFacilities } from "../utils/facilitySearch";

// Standalone "find a facility by name/operator" panel, distinct from
// NearMePanel's "what's near me" — triggered from its own button in
// App.jsx and dismissed the same way CompareModal's search dropdown is:
// select a result, click the close button, or click outside.
export default function FacilitySearchPanel({ datacenters, onSelect, onClose }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchFacilities(datacenters, query), [datacenters, query]);

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

        <ul className="facility-search-results">
          {results.map((dc) => (
            <li key={dc.id}>
              <button
                type="button"
                className="facility-search-result-btn"
                onClick={() => onSelect(dc.id)}
              >
                <span className="facility-search-result-name">{dc.name}</span>
                <span className="facility-search-result-operator">{dc.operator ?? "—"}</span>
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
