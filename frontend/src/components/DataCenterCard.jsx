const WATER_COLORS = { low: "#22c55e", moderate: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const WATER_LABELS = { low: "Low stress", moderate: "Moderate stress", high: "High stress", critical: "Critical stress" };
const PRECISION_WARNINGS = {
  approximate: "Location is approximate (city/region-level geocode)",
  country: "Location is approximate (country-level geocode only)",
  failed: "Location unknown — could not be geocoded",
};

function fmt(n, unit = "") {
  if (n == null || n === "") return "—";
  return n.toLocaleString() + (unit ? " " + unit : "");
}

function SectionHeader({ children }) {
  return <div className="dc-section-label">{children}</div>;
}

function StatRow({ label, value, sub, accent }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
        {sub && <span className="stat-sub"> {sub}</span>}
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

export default function DataCenterCard({ dc, onClose }) {
  const impact = dc.impact || {};
  const elec = impact.electricity || {};
  const water = impact.water || {};
  const carbon = impact.carbon || {};
  const land = impact.land || {};
  const isAnnounced = (dc.data_status ?? impact.data_status) === "announced";

  const waterColor = WATER_COLORS[water.severity] ?? "#64748b";
  const precisionWarning = PRECISION_WARNINGS[dc.geocode_precision];

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
          <StatRow label="Homes powered" value={fmt(elec.homes_powered)} />
          <StatRow label="Annual draw" value={elec.annual_kwh != null ? `${(elec.annual_kwh / 1e9).toFixed(1)} TWh` : "—"} />
          <StatRow
            label="Est. local price lift"
            value={elec.price_lift_pct != null ? `+${elec.price_lift_pct}%` : "—"}
            accent="#f59e0b"
            sub="above baseline"
          />
          <p className="impact-note">
            Large data centers can consume a significant share of a regional grid, driving up electricity rates for surrounding residents.
          </p>
        </ImpactBlock>

        <ImpactBlock title="Water" icon="💧" color={waterColor}>
          <StatRow
            label="Daily withdrawal"
            value={fmt(water.daily_withdrawal_mgd, "MGD")}
            accent={waterColor}
          />
          <StatRow
            label="Severity"
            value={WATER_LABELS[water.severity] ?? "—"}
            accent={waterColor}
          />
          <p className="impact-note">
            Cooling towers evaporate millions of gallons daily, competing with municipal water supplies and local agriculture — especially critical in drought-prone regions.
          </p>
        </ImpactBlock>

        <ImpactBlock title="Carbon & Air" icon="🌫️" color="#94a3b8">
          <StatRow label="Annual CO₂" value={fmt(carbon.annual_co2_tonnes, "t")} />
          <StatRow label="Cars equivalent" value={fmt(carbon.cars_equivalent)} sub="cars/yr" />
          <StatRow label="Grid renewables" value={carbon.renewable_pct != null ? `${carbon.renewable_pct}%` : "—"} />
          <div className="dc-renewables-bar" style={{ marginTop: 8 }}>
            <div className="dc-renewables-fill" style={{ width: `${carbon.renewable_pct ?? 0}%` }} />
          </div>
          <p className="impact-note">
            Diesel backup generators and fossil-heavy grids contribute to local air quality degradation, with particulate matter affecting residents within the impact radius.
          </p>
        </ImpactBlock>

        <ImpactBlock title="Land & Heat" icon="🌡️" color="#f97316">
          <StatRow label="Facility footprint" value={land.footprint_m2 != null ? `~${(land.footprint_m2 / 10_000).toFixed(1)} ha` : "—"} />
          <StatRow label="Waste heat output" value={fmt(land.waste_heat_mw, "MW")} />
          <p className="impact-note">
            Waste heat raises ambient temperatures in surrounding neighborhoods (urban heat island effect), and large campuses displace farmland or natural habitat.
          </p>
        </ImpactBlock>
      </div>
      )}
    </div>
  );
}
