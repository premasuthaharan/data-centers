import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { markerColor, kmToGeoJSONCircle, hasCoordinates, isAnnounced } from "./mapHelpers";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

const MAP_STYLES = {
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
};

function approxNote(precision) {
  if (precision === "country") {
    return `<br/><span class="popup-sub popup-warn">⚠ location approximate (country-level only)</span>`;
  }
  if (precision === "approximate") {
    return `<br/><span class="popup-sub popup-warn">⚠ location approximate (city/region-level)</span>`;
  }
  return "";
}

const ANNOUNCED_COLOR = "#475569";

function buildGeoJSON(datacenters, colorMode) {
  const locatable = datacenters.filter(hasCoordinates);

  const circleFeatures = locatable.map((dc) => ({
    type: "Feature",
    id: dc.id,
    geometry: {
      type: "Polygon",
      coordinates: [kmToGeoJSONCircle(dc.lng, dc.lat, dc.impact?.radius_km ?? 50)],
    },
    properties: {
      id: dc.id,
      color: isAnnounced(dc) ? ANNOUNCED_COLOR : markerColor(dc, colorMode),
      name: dc.name,
      geocodePrecision: dc.geocode_precision ?? "address",
      announced: isAnnounced(dc),
    },
  }));

  const pointFeatures = locatable.map((dc) => ({
    type: "Feature",
    id: dc.id,
    geometry: { type: "Point", coordinates: [dc.lng, dc.lat] },
    properties: {
      id: dc.id,
      color: isAnnounced(dc) ? ANNOUNCED_COLOR : markerColor(dc, colorMode),
      name: dc.name,
      operator: dc.operator,
      geocodePrecision: dc.geocode_precision ?? "address",
      announced: isAnnounced(dc),
    },
  }));

  return { circles: circleFeatures, points: pointFeatures };
}

export default function Map({ datacenters, selectedId, onSelectDatacenter, colorMode = "operator", focusRegion, theme = "dark" }) {
  const mapRef = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);
  const onSelectRef = useRef(onSelectDatacenter);
  onSelectRef.current = onSelectDatacenter;
  // The style.load listener is registered once (see the mount effect below)
  // and re-fires on every setStyle() call, so it must always read the
  // latest theme/datacenters/colorMode via refs rather than closing over
  // the values from whichever render first registered it — otherwise a
  // theme toggle re-adds empty sources and nothing ever repopulates them.
  const themeRef = useRef(theme);
  const datacentersRef = useRef(datacenters);
  const colorModeRef = useRef(colorMode);
  useEffect(() => {
    themeRef.current = theme;
    datacentersRef.current = datacenters;
    colorModeRef.current = colorMode;
  }, [theme, datacenters, colorMode]);

  const handleClick = useCallback((e) => {
    if (e.features?.length) onSelectRef.current(e.features[0].properties.id);
  }, []);

  const setupLayers = useCallback(() => {
    if (themeRef.current === "light") {
      map.current.setFog({
        color: "rgb(255, 255, 255)",
        "high-color": "rgb(230, 235, 245)",
        "horizon-blend": 0.04,
        "space-color": "rgb(210, 220, 235)",
        "star-intensity": 0,
      });
    } else {
      map.current.setFog({
        color: "rgb(10, 10, 20)",
        "high-color": "rgb(15, 15, 40)",
        "horizon-blend": 0.04,
        "space-color": "rgb(5, 5, 15)",
        "star-intensity": 0.8,
      });
    }

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
        "circle-stroke-color": [
          "case",
          ["==", ["get", "geocodePrecision"], "address"],
          "#ffffff",
          "#ffcc00",
        ],
        "circle-stroke-width": [
          "case",
          ["==", ["get", "geocodePrecision"], "address"],
          1.5,
          2.5,
        ],
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
        .setHTML(`<div class="popup"><strong>${p.name}</strong>${approxNote(p.geocodePrecision)}</div>`)
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
        .setHTML(`<div class="popup"><strong>${p.name}</strong><br/><span class="popup-sub">${p.operator}</span>${approxNote(p.geocodePrecision)}</div>`)
        .addTo(map.current);
    });
    map.current.on("mouseleave", "dc-points-hit", () => {
      map.current.getCanvas().style.cursor = "";
      popup.current.remove();
    });

    map.current.on("click", "dc-circles-fill", handleClick);
    map.current.on("click", "dc-points-hit", handleClick);

    // Re-populate from the latest data immediately — setStyle() wipes
    // sources, so a theme switch would otherwise show an empty map until
    // some other prop change happens to re-trigger the data effect below.
    if (datacentersRef.current.length > 0) {
      const { circles, points } = buildGeoJSON(datacentersRef.current, colorModeRef.current);
      map.current.getSource("dc-circles")?.setData({ type: "FeatureCollection", features: circles });
      map.current.getSource("dc-points")?.setData({ type: "FeatureCollection", features: points });
    }
  }, [handleClick]);

  // Tracks which theme the *current* map.current instance's style actually
  // reflects. Set at construction time and whenever setStyle() is invoked —
  // both happen inside effects tied to this specific instance, so (unlike a
  // plain "is this the first run" ref) it can't go stale across StrictMode's
  // dev-mode mount→cleanup→mount cycle, which reuses the component's hook
  // state but does tear down and recreate the actual Map instance.
  const appliedThemeRef = useRef(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;

    const initialTheme = themeRef.current;
    map.current = new mapboxgl.Map({
      container: mapRef.current,
      style: MAP_STYLES[initialTheme] ?? MAP_STYLES.dark,
      center: [-40, 30],
      zoom: 2.2,
      projection: "globe",
    });
    appliedThemeRef.current = initialTheme;

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    popup.current = new mapboxgl.Popup({ closeButton: false, offset: 10 });

    map.current.on("style.load", setupLayers);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch the Mapbox style when the theme changes. setStyle() tears down
  // and reloads the style, which re-fires "style.load" and re-runs
  // setupLayers via the listener registered above.
  useEffect(() => {
    if (!map.current || appliedThemeRef.current === theme) return;
    appliedThemeRef.current = theme;
    map.current.setStyle(MAP_STYLES[theme] ?? MAP_STYLES.dark);
  }, [theme]);

  // Update GeoJSON when datacenters or color mode change
  useEffect(() => {
    if (!map.current || datacenters.length === 0) return;

    const ready = () => {
      const { circles, points } = buildGeoJSON(datacenters, colorMode);
      map.current.getSource("dc-circles")?.setData({ type: "FeatureCollection", features: circles });
      map.current.getSource("dc-points")?.setData({ type: "FeatureCollection", features: points });
    };

    // isStyleLoaded() can still report false for a brief window right after
    // "style.load" has already fired (e.g. during the fog/globe setup that
    // follows it) — checking whether our source actually exists is a more
    // reliable signal that setupLayers has already run than isStyleLoaded().
    // Getting this wrong means style.load never fires again and this data
    // update is silently dropped, leaving the map with no markers.
    if (map.current.getSource("dc-circles")) {
      ready();
    } else {
      map.current.once("style.load", ready);
    }
  }, [datacenters, colorMode]);

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

  // Fit the map to every facility in the focused region, so "focus this
  // region" from the scorecard shows the whole cluster rather than a single
  // facility (which is what selectedId's flyTo above is for).
  useEffect(() => {
    if (!map.current || !focusRegion) return;

    const inRegion = datacenters.filter((dc) => dc.country === focusRegion && hasCoordinates(dc));
    if (inRegion.length === 0) return;

    if (inRegion.length === 1) {
      const dc = inRegion[0];
      map.current.flyTo({ center: [dc.lng, dc.lat], zoom: 6, speed: 1.2, curve: 1.4 });
      return;
    }

    const lngs = inRegion.map((dc) => dc.lng);
    const lats = inRegion.map((dc) => dc.lat);
    const bounds = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    map.current.fitBounds(bounds, { padding: 80, speed: 1.2, curve: 1.4 });
  }, [focusRegion, datacenters]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="map-container map-container--error">
        Mapbox token missing — see .env.example
      </div>
    );
  }

  return <div ref={mapRef} className="map-container" />;
}
