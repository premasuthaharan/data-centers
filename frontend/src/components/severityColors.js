// Shared four-tier severity palette, used for every metric with a real
// bucketed severity scale (water, grid price lift, grid renewables). Values
// are literal hex like the rest of App.css today; if/when light-mode theming
// lands (CSS custom properties on :root), these become the dark-theme
// values and gain a light-theme override, same as any other themed color.
const SEVERITY_COLORS = {
  low: "#22c55e",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const FALLBACK_COLOR = "#64748b";

export function severityColor(severity) {
  return SEVERITY_COLORS[severity] ?? FALLBACK_COLOR;
}
