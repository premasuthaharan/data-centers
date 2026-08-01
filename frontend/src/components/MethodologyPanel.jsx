export default function MethodologyPanel({ onClose }) {
  return (
    <div className="dc-detail-panel">
      <button className="dc-close-btn" onClick={onClose} aria-label="Close">✕</button>

      <div className="dc-detail-header">
        <div className="dc-detail-name">Data Sources & Methodology</div>
        <div className="dc-detail-meta">
          How the numbers on this map are sourced and calculated.
        </div>
      </div>

      <div className="impact-blocks">
        <div className="impact-block" style={{ "--block-color": "#6366f1" }}>
          <div className="impact-block-header">
            <span className="impact-block-icon">🗂️</span>
            <span className="impact-block-title">Data sources</span>
          </div>
          <div className="impact-block-body">
            <p className="impact-note" style={{ marginTop: 0 }}>
              Facility name, operator, country, address, power capacity, and
              capital cost come from the{" "}
              <a
                href="https://epoch.ai/data/data_centers/data_centers.csv"
                target="_blank"
                rel="noopener noreferrer"
              >
                Epoch AI data centers dataset
              </a>
              .
            </p>
            <p className="impact-note">
              Each address is geocoded to coordinates via{" "}
              <a
                href="https://nominatim.openstreetmap.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Nominatim
              </a>{" "}
              (OpenStreetMap), falling back from a full address match to a
              city/region match to a country-level match — the precision
              tier that succeeded is shown on facilities where it's less
              than exact.
            </p>
            <p className="impact-note">
              Grid carbon intensity, renewable %, electricity price, and
              water intensity come from static per-country lookup tables,
              with documented defaults for countries not covered.
            </p>
          </div>
        </div>

        <div className="impact-block" style={{ "--block-color": "#f59e0b" }}>
          <div className="impact-block-header">
            <span className="impact-block-icon">🧮</span>
            <span className="impact-block-title">Impact methodology</span>
          </div>
          <div className="impact-block-body">
            <p className="impact-note" style={{ marginTop: 0 }}>
              <strong>Electricity</strong> — annual draw is estimated from
              nameplate power capacity, an 80% average utilization factor,
              and a Power Usage Effectiveness (PUE) of 1.3. Homes powered
              uses the EIA's ~10,500 kWh/year average US household figure.
            </p>
            <p className="impact-note">
              <strong>Water</strong> — daily withdrawal is derived from
              annual electricity draw and a per-country water intensity
              (liters per kWh), reflecting each country's climate and
              reliance on evaporative cooling.
            </p>
            <p className="impact-note">
              <strong>Carbon</strong> — annual CO₂ combines electricity draw
              with each country's grid carbon intensity. Cars-equivalent
              uses the EPA's commonly cited ~4.6 metric tons CO₂/vehicle/year
              figure.
            </p>
            <p className="impact-note">
              <strong>Cost</strong> — annual electricity cost combines draw
              with a per-country industrial electricity price.
            </p>
            <p className="impact-note">
              Several constants (utilization factor, PUE, IT density, water
              severity thresholds) are internal planning heuristics rather
              than measured or published figures — full derivations and
              sourcing are documented in{" "}
              <a
                href="https://github.com/premasuthaharan/data-centers/blob/main/backend/SOURCES.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                backend/SOURCES.md
              </a>{" "}
              and{" "}
              <a
                href="https://github.com/premasuthaharan/data-centers/blob/main/backend/README.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                backend/README.md
              </a>
              .
            </p>
          </div>
        </div>

        <div className="impact-block" style={{ "--block-color": "#94a3b8" }}>
          <div className="impact-block-header">
            <span className="impact-block-icon">👤</span>
            <span className="impact-block-title">About this project</span>
          </div>
          <div className="impact-block-body">
            <p className="impact-note" style={{ marginTop: 0 }}>
              Built by{" "}
              <a
                href="https://premasuthaharan.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prema Suthaharan
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
