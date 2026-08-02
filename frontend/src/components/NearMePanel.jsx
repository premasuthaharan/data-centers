import { useState, useCallback } from "react";
import { fmt } from "./formatters";
import { severityColor } from "./severityColors";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Prefer the browser's actual geolocation (prompts for permission, accurate
// to device GPS/Wi-Fi) over server-side IP geolocation, which is often
// wildly imprecise (city- or country-level) and never asks the user
// anything. IP-based /api/locate is kept as a fallback for browsers without
// geolocation support or when the user denies the permission prompt.
function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10_000 }
    );
  });
}

export default function NearMePanel({ onFlyTo }) {
  const [status, setStatus] = useState("idle"); // idle | loading | error | done
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const findNearMe = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      let lat, lng;
      try {
        ({ lat, lng } = await getBrowserLocation());
      } catch {
        const locRes = await fetch(`${API}/api/locate`);
        if (!locRes.ok) throw new Error("Could not determine your location");
        ({ lat, lng } = await locRes.json());
      }

      const nearRes = await fetch(
        `${API}/api/datacenters/nearest?lat=${lat}&lng=${lng}&n=5`
      );
      if (!nearRes.ok) throw new Error("Could not load nearby data centers");
      const nearest = await nearRes.json();

      setResults(nearest);
      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResults([]);
    setError(null);
  }, []);

  return (
    <div className="near-me-panel">
      {status === "idle" && (
        <button className="near-me-trigger" onClick={findNearMe}>
          📍 Show data centers near me
        </button>
      )}

      {status === "loading" && (
        <div className="near-me-trigger near-me-trigger--loading">Locating…</div>
      )}

      {status === "error" && (
        <div className="near-me-card">
          <div className="near-me-error">⚠ {error}</div>
          <button className="near-me-retry" onClick={findNearMe}>Try again</button>
        </div>
      )}

      {status === "done" && (
        <div className="near-me-card">
          <div className="near-me-header">
            <span>Nearest to you</span>
            <button className="near-me-close" onClick={reset} aria-label="Close">✕</button>
          </div>
          <ul className="near-me-list">
            {results.map((dc) => {
              const water = dc.impact?.water ?? {};
              const elec = dc.impact?.electricity ?? {};
              const carbon = dc.impact?.carbon ?? {};
              const waterColor = severityColor(water.severity);
              const priceLiftColor = severityColor(elec.price_lift_severity);
              const renewableColor = severityColor(carbon.renewable_severity);
              return (
                <li key={dc.id} className="near-me-item">
                  <button className="near-me-item-btn" onClick={() => onFlyTo?.(dc.id)}>
                    <div className="near-me-item-top">
                      <span className="near-me-item-name">{dc.name}</span>
                      <span className="near-me-item-distance">{fmt(dc.distance_km, "km")}</span>
                    </div>
                    <div className="near-me-item-stats">
                      <span style={elec.price_lift_severity ? { color: priceLiftColor } : undefined}>
                        Grid price lift{" "}
                        <strong>
                          {elec.price_lift_pct != null ? `+${elec.price_lift_pct}%` : "—"}
                        </strong>
                      </span>
                      <span style={{ color: waterColor }}>
                        Water: <strong>{water.severity ?? "—"}</strong>
                      </span>
                      <span style={{ color: renewableColor }} title="Country-level average, not measured per facility">
                        Grid renewables{" "}
                        <strong>{carbon.renewable_pct != null ? `${carbon.renewable_pct}%` : "—"}</strong>
                      </span>
                      <span>
                        Cars equivalent <strong>{fmt(carbon.cars_equivalent)}</strong>
                      </span>
                      <span>
                        Households equivalent <strong>{fmt(water.households_equivalent)}</strong>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
