import { useState, useCallback } from "react";
import { fmt } from "./formatters";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const WATER_COLORS = { low: "#22c55e", moderate: "#f59e0b", high: "#f97316", critical: "#ef4444" };

export default function NearMePanel({ onFlyTo }) {
  const [status, setStatus] = useState("idle"); // idle | loading | error | done
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const findNearMe = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const locRes = await fetch(`${API}/api/locate`);
      if (!locRes.ok) throw new Error("Could not determine your location");
      const { lat, lng } = await locRes.json();

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
              const waterColor = WATER_COLORS[water.severity] ?? "#64748b";
              return (
                <li key={dc.id} className="near-me-item">
                  <button className="near-me-item-btn" onClick={() => onFlyTo?.(dc.id)}>
                    <div className="near-me-item-top">
                      <span className="near-me-item-name">{dc.name}</span>
                      <span className="near-me-item-distance">{fmt(dc.distance_km, "km")}</span>
                    </div>
                    <div className="near-me-item-stats">
                      <span>
                        Grid price lift{" "}
                        <strong>
                          {dc.impact?.electricity?.price_lift_pct != null
                            ? `+${dc.impact.electricity.price_lift_pct}%`
                            : "—"}
                        </strong>
                      </span>
                      <span style={{ color: waterColor }}>
                        Water: <strong>{water.severity ?? "—"}</strong>
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
