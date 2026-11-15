import { useEffect, useMemo, useRef } from "react";
import { LngLatBounds, Map as MapLibreMap, Marker, Popup, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CENTER, MAP_STYLE_DARK, MAP_STYLE_LIGHT, MAP_ZOOM } from "../../config";
import type { StartPoint } from "../../location";
import type { Theme } from "../../theme";
import type { TrailSegment } from "../../api/routing";
import type { Place, Stop } from "../../types";
import { EMPTY_TRAIL, lengthM, toCollection, type TrailCollection } from "./trailGeometry";

type Props = {
  places: Place[];
  theme: Theme;
  start: StartPoint | null;
  stops: Stop[];
  trail: TrailSegment[] | null;
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

// Progressive blur without relying on masks: each layer covers less of the bottom edge than the one
// before it, and blurs stack, so the blur strengthens smoothly towards the bottom.
const BLUR_LAYERS = [1, 1.5, 2, 3, 4, 5, 6, 8];

const styleFor = (theme: Theme) => (theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT);

export function MapView({ places, theme, start, stops, trail }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const themeRef = useRef(theme);
  const appliedTheme = useRef(theme);
  const drawnTrail = useRef<TrailCollection>(EMPTY_TRAIL);

  // The trail layers live in the map style, so they are re-added after every style swap (theme change).
  const drawTrail = (map: MapLibreMap, data: TrailCollection) => {
    drawnTrail.current = data;
    try {
      installTrail(map, themeRef.current, data);
    } catch {
      /* style still loading: the style.load handler draws it */
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
    map.on("style.load", () => drawTrailRef.current(map, drawnTrail.current));
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
    map.setStyle(styleFor(theme)); // DOM markers survive a style swap
  }, [theme]);

  const plannedIds = useMemo(() => stops.map((s) => s.place.id).join(","), [stops]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const planned = new Set(plannedIds.split(","));
    // Planned stops get their own lettered marker, so skip their plain pin.
    const markers = places.filter((p) => !planned.has(p.id)).map((p) =>
      new Marker()
        .setLngLat([p.lng, p.lat])
        .setPopup(new Popup({ offset: 24 }).setText(p.name))
        .addTo(map),
    );
    return () => markers.forEach((m) => m.remove());
  }, [places, plannedIds]);

  // "You are here" marker at the trip's start point, and fly there when it becomes known
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

  // Lettered markers for the planned stops
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

  // The trail: draw it in along its length, then fit the map to it
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
      <div className="map-blur" aria-hidden="true">
        {BLUR_LAYERS.map((blur, i) => (
          <div
            key={i}
            className="map-blur-layer"
            style={{ height: `${100 - i * (100 / BLUR_LAYERS.length)}%`, backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
