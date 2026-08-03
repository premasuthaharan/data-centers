const OPERATOR_COLORS = {
  Amazon:    "#FF9900",
  Microsoft: "#00A4EF",
  Google:    "#34A853",
  Meta:      "#1877F2",
  Apple:     "#888888",
};

// General-purpose facilities (colocation, enterprise, regional cloud AZs —
// not dedicated frontier-AI-lab campuses) get their own color regardless of
// operator, so they read as a distinct category rather than blending into
// "Other" alongside genuinely uncategorized frontier operators.
const GENERAL_PURPOSE_COLOR = "#0d9488";
const OTHER_COLOR = "#9333ea";

export function operatorColor(operator = "", category) {
  if (category === "general-purpose") return GENERAL_PURPOSE_COLOR;
  for (const [key, color] of Object.entries(OPERATOR_COLORS)) {
    if (operator.includes(key)) return color;
  }
  return OTHER_COLOR;
}

const WATER_SEVERITY_COLORS = {
  low: "#22c55e",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export function waterSeverityColor(severity) {
  return WATER_SEVERITY_COLORS[severity] ?? "#64748b";
}

// Picks the marker color for a facility depending on the map's current
// color mode: "operator" (brand color, the default) or "water" (severity
// of water withdrawal — used when a policy scenario is active, since that's
// one of the few impact fields with an established color scale).
export function markerColor(dc, colorMode = "operator") {
  if (colorMode === "water") return waterSeverityColor(dc.impact?.water?.severity);
  return operatorColor(dc.operator, dc.category);
}

// Convert km radius to approximate degrees longitude at a given latitude
// Used to build a GeoJSON circle approximation
export function kmToGeoJSONCircle(lng, lat, radiusKm, steps = 64) {
  const coords = [];
  const distLat = radiusKm / 111.32;
  const distLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([lng + distLng * Math.cos(angle), lat + distLat * Math.sin(angle)]);
  }
  return coords;
}

// Facilities with no successful geocode have null lat/lng and can't be plotted.
export function hasCoordinates(dc) {
  return typeof dc.lat === "number" && typeof dc.lng === "number";
}

export function isAnnounced(dc) {
  return (dc.data_status ?? dc.impact?.data_status) === "announced";
}
