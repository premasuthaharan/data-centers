import { useState, useCallback, useEffect, useMemo } from "react";
import Map from "./components/Map";
import DataCenterCard from "./components/DataCenterCard";
import NearMePanel from "./components/NearMePanel";
import ScenarioPanel from "./components/ScenarioPanel";
import CompareModal from "./components/CompareModal";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WATER_SEVERITY_COLORS = { low: "#22c55e", moderate: "#f59e0b", high: "#f97316", critical: "#ef4444" };

export default function App() {
  const [datacenters, setDatacenters] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // activePanel controls which overlay panel is open. selectedId is kept
  // separate since the detail panel can open from multiple places (marker
  // click, near-me results) without necessarily being the "active panel".
  const [activePanel, setActivePanel] = useState(null); // 'detail' | 'scenario' | 'compare' | null
  const [scenarioData, setScenarioData] = useState(null);

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
    setActivePanel("detail");
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setActivePanel(null);
  }, []);

  const openScenarioPanel = useCallback(() => setActivePanel("scenario"), []);
  const openCompareModal = useCallback(() => setActivePanel("compare"), []);
  const closeOverlayPanel = useCallback(() => setActivePanel(null), []);

  const selectedDC = datacenters.find((dc) => dc.id === selectedId) ?? null;

  // While a scenario is active, the map renders scenario-recomputed
  // facilities colored by water severity instead of operator brand color,
  // so applying a policy is visibly different from the baseline map.
  const mapDatacenters = scenarioData ? scenarioData.data_centers : datacenters;
  const colorMode = scenarioData ? "water" : "operator";

  const legendItems = useMemo(
    () =>
      scenarioData
        ? [
            { label: "Low water stress", color: WATER_SEVERITY_COLORS.low },
            { label: "Moderate", color: WATER_SEVERITY_COLORS.moderate },
            { label: "High", color: WATER_SEVERITY_COLORS.high },
            { label: "Critical", color: WATER_SEVERITY_COLORS.critical },
          ]
        : [
            { label: "Amazon", color: "#FF9900" },
            { label: "Microsoft", color: "#00A4EF" },
            { label: "Google", color: "#34A853" },
            { label: "Meta", color: "#1877F2" },
            { label: "Other", color: "#9333ea" },
          ],
    [scenarioData]
  );

  return (
    <div className="app">
      <Map
        datacenters={mapDatacenters}
        selectedId={selectedId}
        onSelectDatacenter={handleSelect}
        colorMode={colorMode}
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
        <div className="app-actions">
          <button className="app-action-btn" onClick={openScenarioPanel}>
            🧭 Policy scenarios
          </button>
          <button className="app-action-btn" onClick={openCompareModal}>
            ⚖️ Compare facilities
          </button>
        </div>
      </div>

      <NearMePanel onFlyTo={handleSelect} />

      {/* Legend overlay */}
      <div className="map-legend">
        {legendItems.map(({ label, color }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
        {!scenarioData && (
          <>
            <div className="legend-divider" />
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#475569", opacity: 0.55 }} />
              Announced (capacity not yet public)
            </div>
          </>
        )}
      </div>

      {/* Slide-in detail panel */}
      <div className={"detail-panel-wrapper" + (activePanel === "detail" && selectedDC ? " detail-panel-wrapper--open" : "")}>
        {selectedDC && (
          <DataCenterCard dc={selectedDC} onClose={handleClose} />
        )}
      </div>

      {/* Slide-in scenario panel */}
      <div className={"detail-panel-wrapper" + (activePanel === "scenario" ? " detail-panel-wrapper--open" : "")}>
        {activePanel === "scenario" && (
          <ScenarioPanel onClose={closeOverlayPanel} onScenarioChange={setScenarioData} />
        )}
      </div>

      {activePanel === "compare" && (
        <CompareModal datacenters={datacenters} onClose={closeOverlayPanel} />
      )}
    </div>
  );
}
