import { useState, useCallback, useEffect, useMemo } from "react";
import Map from "./components/Map";
import DataCenterCard from "./components/DataCenterCard";
import NearMePanel from "./components/NearMePanel";
import FacilitySearchPanel from "./components/FacilitySearchPanel";
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

  // "all" shows every facility; "frontier-ai" shows only dedicated
  // frontier-AI-lab training campuses (the original Epoch AI-sourced set
  // plus a handful of trackpolicy.org "researched" entries confirmed to be
  // frontier-lab campuses — see backend data). Persisted like theme so a
  // returning visitor's chosen scope sticks.
  const [categoryFilter, setCategoryFilter] = useState(
    () => localStorage.getItem("categoryFilter") || "all"
  );
  useEffect(() => {
    localStorage.setItem("categoryFilter", categoryFilter);
  }, [categoryFilter]);

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

  // True once the initial mount-time URL-decode below has settled (whether
  // or not it found/applied a scenario). The scenario URL-sync effect must
  // not run until this flips true, or it would strip a shared ?scenario=
  // param from the address bar while the initial POST /api/scenario is
  // still in flight (scenarioData is still null at that point).
  const [scenarioUrlHydrated, setScenarioUrlHydrated] = useState(false);

  // Captured once (not re-read inside the effect below) so React 18/19
  // StrictMode's double-invocation of mount effects can't race against the
  // URL-sync effects further down, which rewrite window.location as soon as
  // the first invocation's state settles — a second read at that point
  // could see a ?facility=/?scenario= the sync effects already stripped.
  const [initialParams] = useState(() => new URLSearchParams(window.location.search));

  // On mount, resolve ?facility=<id> and ?scenario=<presetId|custom&...>
  // together so a link carrying both settles once, on first paint, instead
  // of the facility card flashing baseline-then-scenario: GET /api/datacenters
  // and (if a scenario param decodes) POST /api/scenario are kicked off in
  // parallel; once both resolve, selectedId + scenarioData are set together
  // before activePanel, so DataCenterCard never renders with scenarioDc
  // still undefined for a facility that should have deltas. activePanel
  // becomes 'detail' when a facility id is present (with or without a
  // scenario) and 'scenario' when only a scenario is present, matching
  // what the sender was looking at when they copied the link.
  useEffect(() => {
    const sharedFacilityId = initialParams.get("facility");

    const decoded = decodeScenarioParams(initialParams);
    const presetId = decoded?.presetId;
    const preset = presetId ? PRESETS.find((p) => p.id === presetId) : null;
    const scenario = presetId ? preset?.scenario : decoded?.scenario;

    const datacentersPromise = fetch(`${API}/api/datacenters`)
      .then((r) => r.json())
      .catch((e) => {
        setError(e.message);
        return null;
      });

    const scenarioPromise = scenario
      ? fetch(`${API}/api/scenario`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((body) => (body ? { ...body, presetId, presetLabel: preset?.label, scenario } : null))
          .catch(() => null)
      : Promise.resolve(null);

    Promise.all([datacentersPromise, scenarioPromise]).then(([data, appliedScenario]) => {
      if (data) {
        setDatacenters(data.data_centers);
        setGeneratedAt(data.generated_at);
      }
      if (appliedScenario) setScenarioData(appliedScenario);

      const facilityFound =
        sharedFacilityId && data?.data_centers.some((dc) => dc.id === sharedFacilityId);
      if (facilityFound) {
        setSelectedId(sharedFacilityId);
        setActivePanel("detail");
      } else if (appliedScenario) {
        setActivePanel("scenario");
      }

      setLoading(false);
      setScenarioUrlHydrated(true);
    });
  }, [initialParams]);

  const handleSelect = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setActivePanel("detail");
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setActivePanel(null);
  }, []);

  // Facility search is a self-contained overlay (like NearMePanel), not a
  // value of activePanel — the two are peer "find a facility" affordances
  // that can be triggered independently of whatever detail/scenario/compare
  // panel happens to be open.
  const [searchOpen, setSearchOpen] = useState(false);
  const handleSearchSelect = useCallback(
    (id) => {
      handleSelect(id);
      setSearchOpen(false);
    },
    [handleSelect]
  );

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
  const scopedDatacenters = useMemo(
    () =>
      categoryFilter === "all"
        ? datacenters
        : datacenters.filter((dc) => dc.category === categoryFilter),
    [datacenters, categoryFilter]
  );
  const mapDatacenters = scenarioData
    ? scenarioData.data_centers.filter(
        (dc) => categoryFilter === "all" || dc.category === categoryFilter
      )
    : scopedDatacenters;
  const colorMode = scenarioData ? "water" : "operator";

  // "Current view" is mapDatacenters (category-filtered, and
  // scenario-recomputed when a scenario is active), further narrowed by
  // focusedRegion (from the region scorecard) — export scope mirrors
  // exactly what the map is showing.
  const exportCSV = useCallback(() => {
    const rows = focusedRegion
      ? mapDatacenters.filter((dc) => dc.country === focusedRegion)
      : mapDatacenters;

    const columns = [
      ["Name", (dc) => dc.name],
      ["Operator", (dc) => dc.operator],
      ["Country", (dc) => dc.country],
      ["Address", (dc) => dc.address],
      ["Power (MW)", (dc) => dc.power_mw],
      ["Capital cost ($B)", (dc) => dc.cost_usd_billions],
      ["Homes powered", (dc) => dc.impact?.electricity?.homes_powered],
      ["Annual draw (kWh)", (dc) => dc.impact?.electricity?.annual_kwh],
      ["Electricity price lift (%)", (dc) => dc.impact?.electricity?.price_lift_pct],
      ["Water withdrawal (MGD)", (dc) => dc.impact?.water?.daily_withdrawal_mgd],
      ["Water stress severity", (dc) => dc.impact?.water?.severity],
      ["Annual CO2 (tonnes)", (dc) => dc.impact?.carbon?.annual_co2_tonnes],
      ["Cars equivalent", (dc) => dc.impact?.carbon?.cars_equivalent],
      ["Grid renewables (%)", (dc) => dc.impact?.carbon?.renewable_pct],
    ];

    const escapeCell = (value) => {
      if (value == null) return "";
      const s = String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [
      columns.map(([label]) => escapeCell(label)).join(","),
      ...rows.map((dc) => columns.map(([, get]) => escapeCell(get(dc))).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = focusedRegion ? `data-centers-${focusedRegion}.csv` : "data-centers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [mapDatacenters, focusedRegion]);

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
            { label: "Other (frontier-AI)", color: "#9333ea" },
            ...(categoryFilter === "all"
              ? [{ label: "General-purpose", color: "#0d9488" }]
              : []),
          ],
    [scenarioData, categoryFilter]
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
            : `${scopedDatacenters.length} data centers · Click any to explore its impact`}
        </p>
        {!loading && !error && (
          <div className="category-filter-toggle" role="group" aria-label="Facility category filter">
            <button
              className={"category-filter-btn" + (categoryFilter === "all" ? " category-filter-btn--active" : "")}
              onClick={() => setCategoryFilter("all")}
            >
              All ({datacenters.length})
            </button>
            <button
              className={"category-filter-btn" + (categoryFilter === "frontier-ai" ? " category-filter-btn--active" : "")}
              onClick={() => setCategoryFilter("frontier-ai")}
            >
              Frontier-AI ({datacenters.filter((dc) => dc.category === "frontier-ai").length})
            </button>
          </div>
        )}
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
          <button className="app-action-btn" onClick={exportCSV}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div className="facility-finder-cluster">
        <button
          className="facility-search-trigger"
          onClick={() => setSearchOpen(true)}
          aria-label="Search for a facility by name or operator"
          title="Search for a facility"
        >
          🔍
        </button>
        <NearMePanel onFlyTo={handleSelect} />
      </div>

      {searchOpen && (
        <FacilitySearchPanel
          datacenters={scopedDatacenters}
          onSelect={handleSearchSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}

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
            <div className="legend-item">
              <span className="legend-dot legend-dot--hollow" />
              Planned / under construction
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
            activePresetId={scenarioData?.presetId}
            activeScenario={scenarioData?.scenario}
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
            selectedFacilityId={selectedId}
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
        <CompareModal datacenters={scopedDatacenters} onClose={closeOverlayPanel} />
      )}
    </div>
  );
}
