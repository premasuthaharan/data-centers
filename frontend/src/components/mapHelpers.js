const OPERATOR_COLORS = {
  Amazon:    "#FF9900",
  Microsoft: "#00A4EF",
  Google:    "#34A853",
  Meta:      "#1877F2",
  Apple:     "#888888",
};

export function operatorColor(operator = "") {
  for (const [key, color] of Object.entries(OPERATOR_COLORS)) {
    if (operator.includes(key)) return color;
  }
  return "#9333ea";
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
