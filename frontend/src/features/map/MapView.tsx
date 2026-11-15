import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CENTER, MAP_STYLE_DARK, MAP_STYLE_LIGHT, MAP_ZOOM } from "../../config";
import type { StartPoint } from "../../location";
import type { Theme } from "../../theme";
import type { Place } from "../../types";

type Props = { places: Place[]; theme: Theme; start: StartPoint | null };

// Progressive blur without relying on masks: each layer covers less of the bottom edge than the one
// before it, and blurs stack, so the blur strengthens smoothly towards the bottom.
const BLUR_LAYERS = [1, 1.5, 2, 3, 4, 5, 6, 8];

const styleFor = (theme: Theme) => (theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT);

export function MapView({ places, theme, start }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const themeRef = useRef(theme);
  const appliedTheme = useRef(theme);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleFor(themeRef.current),
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    });
    mapRef.current = map;
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = places.map((p) =>
      new Marker()
        .setLngLat([p.lng, p.lat])
        .setPopup(new Popup({ offset: 24 }).setText(p.name))
        .addTo(map),
    );
    return () => markers.forEach((m) => m.remove());
  }, [places]);

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
