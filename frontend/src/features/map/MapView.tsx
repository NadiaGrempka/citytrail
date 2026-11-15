import { useEffect, useRef } from "react";
import { LngLatBounds, Map as MapLibreMap, Marker, Popup, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CENTER, MAP_ZOOM } from "../../config";
import { buildMapStyle } from "./mapStyle";
import type { StartPoint } from "../../location";
import type { Theme } from "../../theme";
import type { TrailSegment } from "../../api/routing";
import { MODE_COLOR, type RouteOverlay } from "../../api/transit";
import type { Place, Stop } from "../../types";
import { EMPTY_TRAIL, lengthM, toCollection, type TrailCollection } from "./trailGeometry";
import "./MapView.css";

type Props = {
  theme: Theme;
  start: StartPoint | null;
  stops: Stop[];
  trail: TrailSegment[] | null;
  focus: { key: number; place: Place } | null;
  route: RouteOverlay | null;
};

const TRAIL_SOURCE = "trail";
const TRAIL_COLOR = "#ff6b4a";

function installTrail(map: MapLibreMap, theme: Theme, data: TrailCollection) {
  const existing = map.getSource<GeoJSONSource>(TRAIL_SOURCE);
  if (existing) {
    existing.setData(data);
    return;
  }
  const casing = theme === "dark" ? "#0e1714" : "#ffffff";
  const layout = { "line-cap": "round", "line-join": "round" } as const;
  map.addSource(TRAIL_SOURCE, { type: "geojson", data });
  map.addLayer({
    id: "trail-casing",
    type: "line",
    source: TRAIL_SOURCE,
    filter: ["==", ["get", "dashed"], false],
    layout,
    paint: { "line-color": casing, "line-width": 9, "line-opacity": 0.9 },
  });
  map.addLayer({
    id: "trail-line",
    type: "line",
    source: TRAIL_SOURCE,
    filter: ["==", ["get", "dashed"], false],
    layout,
    paint: { "line-color": TRAIL_COLOR, "line-width": 5 },
  });
  map.addLayer({
    id: "trail-dashed",
    type: "line",
    source: TRAIL_SOURCE,
    filter: ["==", ["get", "dashed"], true],
    layout: { "line-join": "round" },
    paint: { "line-color": TRAIL_COLOR, "line-width": 4, "line-dasharray": [1.5, 2] },
  });
}

const ROUTE_SOURCE = "route-option";
const TRAIL_LAYERS = ["trail-casing", "trail-line", "trail-dashed"];

function applyRoute(map: MapLibreMap, theme: Theme, route: RouteOverlay | null) {
  const features = (route?.legs ?? [])
    .filter((l) => l.coords.length > 1)
    .map((l) => ({
      type: "Feature" as const,
      properties: { color: MODE_COLOR[l.mode], dashed: l.mode === "walk" },
      geometry: { type: "LineString" as const, coordinates: l.coords },
    }));
  const data = { type: "FeatureCollection" as const, features };
  const existing = map.getSource<GeoJSONSource>(ROUTE_SOURCE);
  if (existing) {
    existing.setData(data);
  } else {
    const layout = { "line-cap": "round", "line-join": "round" } as const;
    map.addSource(ROUTE_SOURCE, { type: "geojson", data });
    map.addLayer({
      id: "route-casing",
      type: "line",
      source: ROUTE_SOURCE,
      layout,
      paint: { "line-color": theme === "dark" ? "#0e1714" : "#ffffff", "line-width": 9, "line-opacity": 0.9 },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "dashed"], false],
      layout,
      paint: { "line-color": ["get", "color"], "line-width": 5 },
    });
    map.addLayer({
      id: "route-dashed",
      type: "line",
      source: ROUTE_SOURCE,
      filter: ["==", ["get", "dashed"], true],
      layout: { "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 4, "line-dasharray": [1.5, 2] },
    });
  }
  TRAIL_LAYERS.forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", route ? "none" : "visible");
  });
}

const styleFor = (theme: Theme) => buildMapStyle(theme);

export function MapView({ theme, start, stops, trail, focus, route }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const themeRef = useRef(theme);
  const appliedTheme = useRef(theme);
  const drawnTrail = useRef<TrailCollection>(EMPTY_TRAIL);
  const routeRef = useRef<RouteOverlay | null>(route);
  const startRef = useRef<StartPoint | null>(start);
  startRef.current = start;

  const drawTrail = (map: MapLibreMap, data: TrailCollection) => {
    drawnTrail.current = data;
    try {
      installTrail(map, themeRef.current, data);
    } catch {
    }
  };
  const drawTrailRef = useRef(drawTrail);
  drawTrailRef.current = drawTrail;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleFor(themeRef.current),
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    });
    mapRef.current = map;
    map.on("style.load", () => {
      drawTrailRef.current(map, drawnTrail.current);
      applyRoute(map, themeRef.current, routeRef.current);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    themeRef.current = theme;
    const map = mapRef.current;
    if (!map || appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    map.setStyle(styleFor(theme));
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !start) return;
    const el = document.createElement("div");
    el.className = "you-are-here";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", start.source === "device" ? "You are here" : `Start point: ${start.label}`);
    const marker = new Marker({ element: el })
      .setLngLat([start.lng, start.lat])
      .setPopup(new Popup({ offset: 16 }).setText(start.source === "device" ? "You are here" : start.label))
      .addTo(map);
    map.flyTo({ center: [start.lng, start.lat], zoom: Math.max(map.getZoom(), 14), duration: 1400 });
    return () => {
      marker.remove();
    };
  }, [start]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || stops.length === 0) return;
    const markers = stops.map((s, i) => {
      const letter = String.fromCharCode(65 + i);
      const el = document.createElement("div");
      el.className = "stop-marker";
      el.textContent = letter;
      el.style.setProperty("--i", String(i));
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", `Stop ${letter}: ${s.place.name}`);
      return new Marker({ element: el })
        .setLngLat([s.place.lng, s.place.lat])
        .setPopup(new Popup({ offset: 20 }).setText(`${letter}. ${s.place.name} (${s.arrive})`))
        .addTo(map);
    });
    return () => markers.forEach((m) => m.remove());
  }, [stops]);

  useEffect(() => {
    routeRef.current = route;
    const map = mapRef.current;
    if (!map) return;
    try {
      applyRoute(map, themeRef.current, route);
    } catch {
      return;
    }
    if (!route) return;
    const bounds = new LngLatBounds();
    route.legs.forEach((l) => l.coords.forEach((c) => bounds.extend(c)));
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: { top: 100, bottom: 120, left: 80, right: 80 }, maxZoom: 16, duration: 1000 });
  }, [route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const el = document.createElement("div");
    el.className = "pick-marker";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", focus.place.name);
    const marker = new Marker({ element: el })
      .setLngLat([focus.place.lng, focus.place.lat])
      .setPopup(new Popup({ offset: 22 }).setText(focus.place.name))
      .addTo(map);
    marker.togglePopup();
    const from = startRef.current;
    if (from) {
      const bounds = new LngLatBounds([from.lng, from.lat], [from.lng, from.lat]);
      bounds.extend([focus.place.lng, focus.place.lat]);
      map.fitBounds(bounds, {
        padding: { top: 140, bottom: 180, left: 120, right: 120 },
        maxZoom: 15.5,
        duration: 1600,
      });
    } else {
      map.flyTo({ center: [focus.place.lng, focus.place.lat], zoom: 15.5, duration: 1600 });
    }
    return () => {
      marker.remove();
    };
  }, [focus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!trail || trail.length === 0) {
      drawTrailRef.current(map, EMPTY_TRAIL);
      return;
    }
    const lengths = trail.map((s) => lengthM(s.coords));
    const total = lengths.reduce((a, b) => a + b, 0);

    const bounds = new LngLatBounds();
    trail.forEach((s) => s.coords.forEach((c) => bounds.extend(c)));
    map.fitBounds(bounds, { padding: { top: 100, bottom: 160, left: 80, right: 80 }, maxZoom: 16, duration: 1200 });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      drawTrailRef.current(map, toCollection(trail, lengths, total));
      return;
    }
    const duration = Math.min(3500, Math.max(1400, total * 1.2));
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - p) ** 3;
      drawTrailRef.current(map, toCollection(trail, lengths, eased * total));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trail]);

  return (
    <div className="map-frame">
      <div ref={containerRef} className="map" />
    </div>
  );
}
