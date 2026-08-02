import { useState, useCallback } from "react";
import { fmt } from "./formatters";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PRESETS = [
  {
    id: "renewable-100",
    label: "100% Renewable Mandate",
    description: "Every facility sources all electricity from renewables.",
    scenario: { renewable_pct: 100 },
  },
  {
    id: "grid-decarbonization",
    label: "Grid Decarbonization",
    description: "Grid carbon intensity drops to 50 gCO₂/kWh.",
    scenario: { carbon_intensity_gco2_per_kwh: 50 },
  },
  {
    id: "pue-standard",
    label: "PUE Efficiency Standard",
    description: "Every facility meets a PUE of 1.1.",
    scenario: { pue: 1.1 },
  },
  {
    id: "water-recycling",
    label: "Water Recycling Requirement",
    description: "Cooling water intensity is cut to 1.0 L/kWh.",
    scenario: { water_liters_per_kwh: 1.0 },
  },
  {
    id: "aggressive-policy",
    label: "Aggressive Policy",
    description: "All of the above, combined.",
    scenario: {
      renewable_pct: 100,
      carbon_intensity_gco2_per_kwh: 50,
      pue: 1.1,
      water_liters_per_kwh: 1.0,
    },
  },
];

function TotalsRow({ label, baseline, scenario, unit, format }) {
  const fmtVal = format ?? ((n) => fmt(n, unit));
  const changed = baseline !== scenario;
  return (
    <div className="scenario-totals-row">
      <span className="scenario-totals-label">{label}</span>
      <span className="scenario-totals-values">
        <span className="scenario-totals-baseline">{fmtVal(baseline)}</span>
        {changed && (
          <>
            <span className="scenario-totals-arrow">→</span>
            <span
              className={
                "scenario-totals-scenario" +
                (scenario < baseline ? " scenario-totals-scenario--down" : " scenario-totals-scenario--up")
              }
            >
              {fmtVal(scenario)}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

export default function ScenarioPanel({ onClose, onScenarioChange }) {
  const [activePresetId, setActivePresetId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const applyScenario = useCallback(
    async (presetId, scenario, presetLabel) => {
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch(`${API}/api/scenario`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario }),
        });
        if (!res.ok) throw new Error("Could not apply scenario");
        const body = await res.json();
        setData(body);
        setActivePresetId(presetId);
        setStatus("idle");
        // presetLabel is attached here (rather than in the API response)
        // so other consumers of scenarioData — e.g. DataCenterCard's
        // "Under: <label>" badge — can show which policy is active without
        // a backend change.
        onScenarioChange?.({ ...body, presetLabel });
      } catch (e) {
        setError(e.message);
        setStatus("error");
      }
    },
    [onScenarioChange]
  );

  const reset = useCallback(() => {
    setActivePresetId(null);
    setData(null);
    setStatus("idle");
    setError(null);
    onScenarioChange?.(null);
  }, [onScenarioChange]);

  return (
    <div className="scenario-panel">
      <button className="dc-close-btn" onClick={onClose} aria-label="Close">✕</button>

      <div className="scenario-panel-header">
        <div className="scenario-panel-title">Policy Scenarios</div>
        <p className="scenario-panel-subtitle">
          See how a proposed policy would change the map and total footprint.
        </p>
      </div>

      <div className="scenario-preset-list">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={
              "scenario-preset-btn" + (activePresetId === preset.id ? " scenario-preset-btn--active" : "")
            }
            onClick={() => applyScenario(preset.id, preset.scenario, preset.label)}
            disabled={status === "loading"}
          >
            <span className="scenario-preset-label">{preset.label}</span>
            <span className="scenario-preset-desc">{preset.description}</span>
          </button>
        ))}
      </div>

      {activePresetId && (
        <button className="scenario-reset-btn" onClick={reset} disabled={status === "loading"}>
          Reset to baseline
        </button>
      )}

      {status === "loading" && <div className="scenario-status">Applying scenario…</div>}
      {status === "error" && <div className="scenario-status scenario-status--error">⚠ {error}</div>}

      {data && (
        <div className="scenario-totals">
          <div className="scenario-totals-heading">
            {data.baseline_totals.facility_count} facilities · baseline → scenario
          </div>
          <TotalsRow
            label="Annual CO₂"
            baseline={data.baseline_totals.annual_co2_tonnes}
            scenario={data.scenario_totals.annual_co2_tonnes}
            unit="t"
          />
          <TotalsRow
            label="Water withdrawal"
            baseline={data.baseline_totals.daily_withdrawal_mgd}
            scenario={data.scenario_totals.daily_withdrawal_mgd}
            unit="MGD"
          />
          <TotalsRow
            label="Annual electricity"
            baseline={data.baseline_totals.annual_kwh}
            scenario={data.scenario_totals.annual_kwh}
            format={(n) => `${(n / 1e9).toFixed(1)} TWh`}
          />
          <TotalsRow
            label="Annual cost"
            baseline={data.baseline_totals.annual_cost_millions_usd}
            scenario={data.scenario_totals.annual_cost_millions_usd}
            format={(n) => `$${n.toLocaleString()}M`}
          />
        </div>
      )}
    </div>
  );
}
