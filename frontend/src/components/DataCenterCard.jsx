import { useState, useCallback } from "react";
import { fmt } from "./formatters";
import { severityColor } from "./severityColors";
import { encodeScenarioParams } from "../utils/scenarioUrl";

const WATER_LABELS = { low: "Low stress", moderate: "Moderate stress", high: "High stress", critical: "Critical stress" };
const WATER_SEVERITY_RANK = { low: 0, moderate: 1, high: 2, critical: 3 };
const WATER_SEVERITY_BY_RANK = ["low", "moderate", "high", "critical"];
const PRECISION_WARNINGS = {
  approximate: "Location is approximate (city/region-level geocode)",
  country: "Location is approximate (country-level geocode only)",
  failed: "Location unknown — could not be geocoded",
};

function SectionHeader({ children }) {
  return <div className="dc-section-label">{children}</div>;
}

// value/scenarioValue are raw numbers (or ranks, for severity) so the
// improved/worsened direction can be computed correctly — formatting always
// happens through `format`. Mirrors ScenarioPanel's TotalsRow baseline →
// scenario convention. Only rendered when scenarioValue differs from value,
// so fields a scenario doesn't touch stay plain rather than showing a
// same-to-same arrow.
function StatRow({ label, value, format, sub, accent, scenarioValue, lowerIsBetter = true }) {
  const fmtVal = format ?? ((n) => fmt(n));
  const changed = scenarioValue != null && scenarioValue !== value;
  const improved = changed && (lowerIsBetter ? scenarioValue < value : scenarioValue > value);
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={accent ? { color: accent } : undefined}>
        {fmtVal(value)}
        {sub && <span className="stat-sub"> {sub}</span>}
        {changed && (
          <>
            <span className="scenario-totals-arrow"> → </span>
            <span
              className={
                "scenario-totals-scenario" +
                (improved ? " scenario-totals-scenario--down" : " scenario-totals-scenario--up")
              }
            >
              {fmtVal(scenarioValue)}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

function ImpactBlock({ title, color, icon, children }) {
  return (
    <div className="impact-block" style={{ "--block-color": color }}>
      <div className="impact-block-header">
        <span className="impact-block-icon">{icon}</span>
        <span className="impact-block-title">{title}</span>
      </div>
      <div className="impact-block-body">{children}</div>
    </div>
  );
}

export default function DataCenterCard({ dc, scenarioDc, scenarioLabel, onClose, activePresetId, activeScenario }) {
  const impact = dc.impact || {};
  const elec = impact.electricity || {};
  const water = impact.water || {};
  const carbon = impact.carbon || {};
  const land = impact.land || {};
  const isAnnounced = (dc.data_status ?? impact.data_status) === "announced";

  const sImpact = scenarioDc?.impact;
  const sElec = sImpact?.electricity;
  const sWater = sImpact?.water;
  const sCarbon = sImpact?.carbon;
  const sLand = sImpact?.land;

  const waterColor = severityColor(water.severity);
  const priceLiftColor = severityColor(elec.price_lift_severity);
  const renewableColor = severityColor(carbon.renewable_severity);
  const precisionWarning = PRECISION_WARNINGS[dc.geocode_precision];

  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("facility", dc.id);

    const scenarioParams = encodeScenarioParams(activePresetId, activeScenario);
    for (const key of ["scenario", "renewable_pct", "carbon_intensity_gco2_per_kwh", "water_liters_per_kwh", "pue"]) {
      url.searchParams.delete(key);
    }
    for (const [key, value] of scenarioParams) url.searchParams.set(key, value);

    navigator.clipboard.writeText(url.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [dc.id, activePresetId, activeScenario]);

  return (
    <div className="dc-detail-panel">
      <button className="dc-close-btn" onClick={onClose} aria-label="Close">✕</button>

      <div className="dc-detail-header">
        <div className="dc-detail-name">{dc.name}</div>
        <div className="dc-detail-meta">
          {dc.operator} · {dc.country}
          {dc.address && <><br /><span className="dc-address">{dc.address}</span></>}
        </div>
        {precisionWarning && <div className="dc-precision-warning">⚠ {precisionWarning}</div>}
        {sImpact && (
          <div className="dc-scenario-badge">
            🧭 Under: {scenarioLabel ?? "active scenario"}
          </div>
        )}
        <button className="dc-copy-link-btn" onClick={copyLink}>
          {copied ? "✓ Link copied" : "🔗 Copy link"}
        </button>
      </div>

      <div className="dc-detail-stats">
        <div className="dc-stat-chip">
          <span className="chip-val">{dc.power_mw ? `${dc.power_mw.toLocaleString()} MW` : "—"}</span>
          <span className="chip-label">Power</span>
        </div>
        <div className="dc-stat-chip">
          <span className="chip-val">{dc.cost_usd_billions != null ? `$${dc.cost_usd_billions.toFixed(1)}B` : "—"}</span>
          <span className="chip-label">Capital cost</span>
        </div>
        <div className="dc-stat-chip">
          <span className="chip-val">{fmt(impact.radius_km, "km")}</span>
          <span className="chip-label">Impact radius</span>
        </div>
      </div>

      {isAnnounced && (
        <div className="dc-announced-notice">
          Capacity not yet publicly announced — impact estimates below are unavailable, not zero.
        </div>
      )}

      {isAnnounced ? null : (
      <div className="impact-blocks">
        <ImpactBlock title="Electricity" icon="⚡" color="#f59e0b">
          <StatRow label="Homes powered" value={elec.homes_powered} scenarioValue={sElec?.homes_powered} />
          <StatRow
            label="Annual draw"
            value={elec.annual_kwh}
            scenarioValue={sElec?.annual_kwh}
            format={(n) => (n != null ? `${(n / 1e9).toFixed(1)} TWh` : "—")}
          />
          <StatRow
            label="Est. local price lift"
            value={elec.price_lift_pct}
            scenarioValue={sElec?.price_lift_pct}
            format={(n) => (n != null ? `+${n}%` : "—")}
            accent={priceLiftColor}
            sub="above baseline"
          />
          <p className="impact-note">
            Large data centers can consume a significant share of a regional grid, driving up electricity rates for surrounding residents.
          </p>
        </ImpactBlock>

        <ImpactBlock title="Water" icon="💧" color={waterColor}>
          <StatRow
            label="Daily withdrawal"
            value={water.daily_withdrawal_mgd}
            scenarioValue={sWater?.daily_withdrawal_mgd}
            format={(n) => fmt(n, "MGD")}
            accent={waterColor}
          />
          <StatRow
            label="Severity"
            value={WATER_SEVERITY_RANK[water.severity] ?? 0}
            scenarioValue={sWater ? WATER_SEVERITY_RANK[sWater.severity] ?? 0 : undefined}
            format={(rank) => WATER_LABELS[WATER_SEVERITY_BY_RANK[rank]] ?? "—"}
            accent={waterColor}
          />
          <StatRow
            label="Households equivalent"
            value={water.households_equivalent}
            scenarioValue={sWater?.households_equivalent}
            sub="households/day"
          />
          <p className="impact-note">
            Cooling towers evaporate millions of gallons daily, competing with municipal water supplies and local agriculture — especially critical in drought-prone regions.
          </p>
        </ImpactBlock>

        <ImpactBlock title="Carbon & Air" icon="🌫️" color="#94a3b8">
          <StatRow
            label="Annual CO₂"
            value={carbon.annual_co2_tonnes}
            scenarioValue={sCarbon?.annual_co2_tonnes}
            format={(n) => fmt(n, "t")}
          />
          <StatRow
            label="Cars equivalent"
            value={carbon.cars_equivalent}
            scenarioValue={sCarbon?.cars_equivalent}
            sub="cars/yr"
          />
          <StatRow
            label="Grid renewables"
            value={carbon.renewable_pct}
            scenarioValue={sCarbon?.renewable_pct}
            format={(n) => (n != null ? `${n}%` : "—")}
            lowerIsBetter={false}
            accent={renewableColor}
          />
          <div className="dc-renewables-bar" style={{ marginTop: 8 }}>
            <div className="dc-renewables-fill" style={{ width: `${(sCarbon ?? carbon).renewable_pct ?? 0}%` }} />
          </div>
          <p className="impact-note">
            Diesel backup generators and fossil-heavy grids contribute to local air quality degradation, with particulate matter affecting residents within the impact radius.
          </p>
        </ImpactBlock>

        <ImpactBlock title="Land & Heat" icon="🌡️" color="#f97316">
          <StatRow
            label="Facility footprint"
            value={land.footprint_m2}
            scenarioValue={sLand?.footprint_m2}
            format={(n) => (n != null ? `~${(n / 10_000).toFixed(1)} ha` : "—")}
          />
          <StatRow
            label="Waste heat output"
            value={land.waste_heat_mw}
            scenarioValue={sLand?.waste_heat_mw}
            format={(n) => fmt(n, "MW")}
          />
          <p className="impact-note">
            Waste heat raises ambient temperatures in surrounding neighborhoods (urban heat island effect), and large campuses displace farmland or natural habitat.
          </p>
        </ImpactBlock>
      </div>
      )}
    </div>
  );
}
