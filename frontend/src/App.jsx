import { useState, useCallback, useEffect } from "react";
import Map from "./components/Map";
import DataCenterCard from "./components/DataCenterCard";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [datacenters, setDatacenters] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/datacenters`)
      .then((r) => r.json())
      .then((data) => {
        setDatacenters(data.data_centers);
        setGeneratedAt(data.generated_at);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleClose = useCallback(() => setSelectedId(null), []);

  const selectedDC = datacenters.find((dc) => dc.id === selectedId) ?? null;

  return (
    <div className="app">
      <Map
        datacenters={datacenters}
        selectedId={selectedId}
        onSelectDatacenter={handleSelect}
      />

      {/* Top-left title overlay */}
      <div className="map-overlay-title">
        <h1 className="app-title">Data Center Impact</h1>
        <p className="app-subtitle">
          {loading
            ? "Loading data centers…"
            : error
            ? `Error: ${error}`
            : `${datacenters.length} data centers · Click any to explore its impact`}
        </p>
        {generatedAt && (
          <p className="app-freshness">
            Data as of{" "}
            {new Date(generatedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Legend overlay */}
      <div className="map-legend">
        {[
          { label: "Amazon", color: "#FF9900" },
          { label: "Microsoft", color: "#00A4EF" },
          { label: "Google", color: "#34A853" },
          { label: "Meta", color: "#1877F2" },
          { label: "Other", color: "#9333ea" },
        ].map(({ label, color }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Slide-in detail panel */}
      <div className={"detail-panel-wrapper" + (selectedDC ? " detail-panel-wrapper--open" : "")}>
        {selectedDC && (
          <DataCenterCard dc={selectedDC} onClose={handleClose} />
        )}
      </div>
    </div>
  );
}
