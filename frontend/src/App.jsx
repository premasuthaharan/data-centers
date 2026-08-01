import { useState, useCallback, useEffect, useMemo } from "react";
import Map from "./components/Map";
import DataCenterCard from "./components/DataCenterCard";
import NearMePanel from "./components/NearMePanel";
import ScenarioPanel, { PRESETS } from "./components/ScenarioPanel";
import CompareModal from "./components/CompareModal";
import MethodologyPanel from "./components/MethodologyPanel";
import RegionScorecard from "./components/RegionScorecard";
import { resolveInitialTheme } from "./theme";
import { encodeScenarioParams, decodeScenarioParams } from "./utils/scenarioUrl";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WATER_SEVERITY_COLORS = { low: "#22c55e", moderate: "#f59e0b", high: "#f97316", critical: "#ef4444" };

export default function App() {
  const [datacenters, setDatacenters] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // activePanel controls which overlay panel is open. selectedId is kept
  // separate since the detail panel can open from multiple places (marker
  // click, near-me results) without necessarily being the "active panel".
  const [activePanel, setActivePanel] = useState(null); // 'detail' | 'scenario' | 'compare' | 'methodology' | 'scorecard' | null
  const [scenarioData, setScenarioData] = useState(null);
  const [focusedRegion, setFocusedRegion] = useState(null);

  useEffect(() => {
    // Captured before this data loads so a shared-link facility opens once
    // the list arrives, without racing the URL-sync effect below (which
    // would otherwise strip the query param on its own first run).
    const sharedFacilityId = new URLSearchParams(window.location.search).get("facility");

    fetch(`${API}/api/datacenters`)
      .then((r) => r.json())
      .then((data) => {
        setDatacenters(data.data_centers);
        setGeneratedAt(data.generated_at);
        if (sharedFacilityId && data.data_centers.some((dc) => dc.id === sharedFacilityId)) {
          setSelectedId(sharedFacilityId);
          setActivePanel("detail");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // True once the initial URL-decode attempt below has settled (whether or
  // not it found/applied a scenario). The scenario URL-sync effect must not
  // run until this flips true, or it would strip a shared ?scenario= param
  // from the address bar while the initial POST /api/scenario is still
  // in flight (scenarioData is still null at that point).
  const [scenarioUrlHydrated, setScenarioUrlHydrated] = useState(false);

  // On mount, check for a shared scenario in the URL (?scenario=<presetId>
  // or ?scenario=custom&renewable_pct=...&pue=...). If present, re-apply it
  // via POST /api/scenario and open the scenario panel pre-populated, so a
  // shared link reproduces what the sender saw instead of the default
  // baseline map. A preset id resolves to its overrides via PRESETS; a
  // malformed/unknown preset id or empty custom params decodes to null and
  // is silently ignored (falls back to baseline).
  useEffect(() => {
    const decoded = decodeScenarioParams(new URLSearchParams(window.location.search));
    const presetId = decoded?.presetId;
    const scenario = presetId
      ? PRESETS.find((p) => p.id === presetId)?.scenario
      : decoded?.scenario;

    if (!scenario) {
      setScenarioUrlHydrated(true);
      return;
    }

    fetch(`${API}/api/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body) {
          setScenarioData({ ...body, presetId, scenario });
          setActivePanel("scenario");
        }
      })
      .catch(() => {})
      .finally(() => setScenarioUrlHydrated(true));
  }, []);

  const handleSelect = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setActivePanel("detail");
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setActivePanel(null);
  }, []);

  // Keep the URL in sync with the open detail card so it's always
  // shareable, without triggering a page reload or extra history entries
  // per keystroke-equivalent state change.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activePanel === "detail" && selectedId) {
      url.searchParams.set("facility", selectedId);
    } else {
      url.searchParams.delete("facility");
    }
    if (url.href !== window.location.href) {
      window.history.pushState(null, "", url);
    }
  }, [selectedId, activePanel]);

  // Keep the URL in sync with the applied scenario (mirrors the facility
  // sync above) so the address bar always reflects what's on screen and
  // reset clears the params rather than leaving a stale scenario in the URL.
  // Gated on scenarioUrlHydrated — see its declaration above.
  useEffect(() => {
    if (!scenarioUrlHydrated) return;

    const url = new URL(window.location.href);
    const scenarioKeys = ["scenario", "renewable_pct", "carbon_intensity_gco2_per_kwh", "water_liters_per_kwh", "pue"];
    for (const key of scenarioKeys) url.searchParams.delete(key);

    if (scenarioData) {
      const params = encodeScenarioParams(scenarioData.presetId, scenarioData.scenario);
      for (const [key, value] of params) url.searchParams.set(key, value);
    }

    if (url.href !== window.location.href) {
      window.history.pushState(null, "", url);
    }
  }, [scenarioData, scenarioUrlHydrated]);

  const openScenarioPanel = useCallback(() => setActivePanel("scenario"), []);
  const openCompareModal = useCallback(() => setActivePanel("compare"), []);
  const closeOverlayPanel = useCallback(() => setActivePanel(null), []);
  const openMethodologyPanel = useCallback(() => setActivePanel("methodology"), []);
  const openScorecardPanel = useCallback(() => setActivePanel("scorecard"), []);

  const handleFocusRegion = useCallback((region) => {
    setFocusedRegion(region.region);
  }, []);

  const selectedDC = datacenters.find((dc) => dc.id === selectedId) ?? null;
  // The scenario-recomputed record for the selected facility, if a scenario
  // is active and this facility is within its scope (POST /api/scenario's
  // facility_ids, when used — currently always all facilities since
  // ScenarioPanel doesn't scope by id). undefined when no scenario is
  // active or the facility falls outside scope, which DataCenterCard treats
  // as "render baseline only".
  const scenarioDC = scenarioData?.data_centers.find((dc) => dc.id === selectedId);

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
        focusRegion={focusedRegion}
        theme={theme}
      />

      {/* Top-left title overlay */}
      <div className="map-overlay-title">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button
          className="info-btn"
          onClick={openMethodologyPanel}
          aria-label="Data sources & methodology"
          title="Data sources & methodology"
        >
          i
        </button>
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
          <button className="app-action-btn" onClick={openScorecardPanel}>
            🏆 Region scorecard
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
          <DataCenterCard
            dc={selectedDC}
            scenarioDc={scenarioDC}
            scenarioLabel={scenarioData?.presetLabel}
            onClose={handleClose}
          />
        )}
      </div>

      {/* Slide-in methodology panel */}
      <div className={"detail-panel-wrapper" + (activePanel === "methodology" ? " detail-panel-wrapper--open" : "")}>
        {activePanel === "methodology" && (
          <MethodologyPanel onClose={closeOverlayPanel} />
        )}
      </div>

      {/* Slide-in scenario panel */}
      <div className={"detail-panel-wrapper" + (activePanel === "scenario" ? " detail-panel-wrapper--open" : "")}>
        {activePanel === "scenario" && (
          <ScenarioPanel
            onClose={closeOverlayPanel}
            onScenarioChange={setScenarioData}
            initialScenarioData={scenarioData}
          />
        )}
      </div>

      {/* Slide-in region scorecard panel */}
      <div className={"detail-panel-wrapper" + (activePanel === "scorecard" ? " detail-panel-wrapper--open" : "")}>
        {activePanel === "scorecard" && (
          <RegionScorecard onClose={closeOverlayPanel} onFocusRegion={handleFocusRegion} />
        )}
      </div>

      {activePanel === "compare" && (
        <CompareModal datacenters={datacenters} onClose={closeOverlayPanel} />
      )}
    </div>
  );
}
