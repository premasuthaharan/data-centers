import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

const OPERATOR_COLORS = {
  Amazon:    "#FF9900",
  Microsoft: "#00A4EF",
  Google:    "#34A853",
  Meta:      "#1877F2",
  Apple:     "#888888",
};

function operatorColor(operator = "") {
  for (const [key, color] of Object.entries(OPERATOR_COLORS)) {
    if (operator.includes(key)) return color;
  }
  return "#9333ea";
}

// Convert km radius to approximate degrees longitude at a given latitude
// Used to build a GeoJSON circle approximation
function kmToGeoJSONCircle(lng, lat, radiusKm, steps = 64) {
  const coords = [];
  const distLat = radiusKm / 111.32;
  const distLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([lng + distLng * Math.cos(angle), lat + distLat * Math.sin(angle)]);
  }
  return coords;
}

const ANNOUNCED_COLOR = "#475569";

function isAnnounced(dc) {
  return (dc.data_status ?? dc.impact?.data_status) === "announced";
}

function buildGeoJSON(datacenters) {
  const circleFeatures = datacenters.map((dc) => ({
    type: "Feature",
    id: dc.id,
    geometry: {
      type: "Polygon",
      coordinates: [kmToGeoJSONCircle(dc.lng, dc.lat, dc.impact?.radius_km ?? 50)],
    },
    properties: {
      id: dc.id,
      color: isAnnounced(dc) ? ANNOUNCED_COLOR : operatorColor(dc.operator),
      name: dc.name,
      announced: isAnnounced(dc),
    },
  }));

  const pointFeatures = datacenters.map((dc) => ({
    type: "Feature",
    id: dc.id,
    geometry: { type: "Point", coordinates: [dc.lng, dc.lat] },
    properties: {
      id: dc.id,
      color: isAnnounced(dc) ? ANNOUNCED_COLOR : operatorColor(dc.operator),
      name: dc.name,
      operator: dc.operator,
      announced: isAnnounced(dc),
    },
  }));

  return { circles: circleFeatures, points: pointFeatures };
}

export default function Map({ datacenters, selectedId, onSelectDatacenter }) {
  const mapRef = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);
  const onSelectRef = useRef(onSelectDatacenter);
  onSelectRef.current = onSelectDatacenter;

  const handleClick = useCallback((e) => {
    if (e.features?.length) onSelectRef.current(e.features[0].properties.id);
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;

    map.current = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-40, 30],
      zoom: 2.2,
      projection: "globe",
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    popup.current = new mapboxgl.Popup({ closeButton: false, offset: 10 });

    map.current.on("style.load", () => {
      map.current.setFog({
        color: "rgb(10, 10, 20)",
        "high-color": "rgb(15, 15, 40)",
        "horizon-blend": 0.04,
        "space-color": "rgb(5, 5, 15)",
        "star-intensity": 0.8,
      });

      // Add empty sources — will be populated once data arrives
      map.current.addSource("dc-circles", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.current.addSource("dc-points",  { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      // Impact radius fill
      map.current.addLayer({
        id: "dc-circles-fill",
        type: "fill",
        source: "dc-circles",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["==", ["get", "id"], ""],
            0.18,
            0.08,
          ],
        },
      });

      // Impact radius border
      map.current.addLayer({
        id: "dc-circles-border",
        type: "line",
        source: "dc-circles",
        paint: {
          "line-color": ["get", "color"],
          "line-opacity": 0.35,
          "line-width": 1,
        },
      });

      // DC dot (visible)
      map.current.addLayer({
        id: "dc-points-layer",
        type: "circle",
        source: "dc-points",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 4,
            6, 7,
            10, 10,
          ],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": ["case", ["get", "announced"], 0.55, 0.9],
        },
      });

      // Transparent hit-target on top so dots are always clickable
      map.current.addLayer({
        id: "dc-points-hit",
        type: "circle",
        source: "dc-points",
        paint: {
          "circle-radius": 18,
          "circle-opacity": 0,
          "circle-stroke-width": 0,
        },
      });

      // Hover on circles
      map.current.on("mouseenter", "dc-circles-fill", (e) => {
        map.current.getCanvas().style.cursor = "pointer";
        const p = e.features[0].properties;
        popup.current
          .setLngLat(e.lngLat)
          .setHTML(`<div class="popup"><strong>${p.name}</strong></div>`)
          .addTo(map.current);
      });
      map.current.on("mouseleave", "dc-circles-fill", () => {
        map.current.getCanvas().style.cursor = "";
        popup.current.remove();
      });

      // Hover on points (via hit target)
      map.current.on("mouseenter", "dc-points-hit", (e) => {
        map.current.getCanvas().style.cursor = "pointer";
        const p = e.features[0].properties;
        popup.current
          .setLngLat(e.lngLat)
          .setHTML(`<div class="popup"><strong>${p.name}</strong><br/><span class="popup-sub">${p.operator}</span></div>`)
          .addTo(map.current);
      });
      map.current.on("mouseleave", "dc-points-hit", () => {
        map.current.getCanvas().style.cursor = "";
        popup.current.remove();
      });

      map.current.on("click", "dc-circles-fill", handleClick);
      map.current.on("click", "dc-points-hit", handleClick);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update GeoJSON when datacenters load
  useEffect(() => {
    if (!map.current || datacenters.length === 0) return;

    const ready = () => {
      const { circles, points } = buildGeoJSON(datacenters);
      map.current.getSource("dc-circles")?.setData({ type: "FeatureCollection", features: circles });
      map.current.getSource("dc-points")?.setData({ type: "FeatureCollection", features: points });
    };

    if (map.current.isStyleLoaded()) {
      ready();
    } else {
      map.current.once("style.load", ready);
    }
  }, [datacenters]);

  // Highlight selected DC
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    map.current.setPaintProperty("dc-circles-fill", "fill-opacity", [
      "case",
      ["==", ["get", "id"], selectedId ?? ""],
      0.22,
      0.08,
    ]);
    map.current.setPaintProperty("dc-circles-border", "line-opacity", [
      "case",
      ["==", ["get", "id"], selectedId ?? ""],
      0.9,
      0.3,
    ]);
    map.current.setPaintProperty("dc-circles-border", "line-width", [
      "case",
      ["==", ["get", "id"], selectedId ?? ""],
      2,
      1,
    ]);

    // Fly to selected
    if (selectedId) {
      const dc = datacenters.find((d) => d.id === selectedId);
      if (dc) {
        map.current.flyTo({ center: [dc.lng, dc.lat], zoom: 6, speed: 1.2, curve: 1.4 });
      }
    }
  }, [selectedId, datacenters]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="map-container map-container--error">
        Mapbox token missing — see .env.example
      </div>
    );
  }

  return <div ref={mapRef} className="map-container" />;
}
