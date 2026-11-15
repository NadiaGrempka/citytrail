import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { Theme } from "../../theme";

type Palette = {
  land: string;
  building: string;
  road: string;
  path: string;
  park: string;
  water: string;
  rail: string;
  label: string;
  labelStrong: string;
};

const PALETTES: Record<Theme, Palette> = {
  light: {
    land: "#e7e8e6",
    building: "#bcbebc",
    road: "#ffffff",
    path: "#ffffff",
    park: "#c4e0a8",
    water: "#b9d9ee",
    rail: "#cfd1cf",
    label: "#8b918d",
    labelStrong: "#6f7672",
  },
  dark: {
    land: "#131916",
    building: "#262f2b",
    road: "#34413b",
    path: "#2f3b35",
    park: "#1e3a2a",
    water: "#18303f",
    rail: "#2a342f",
    label: "#6f7c75",
    labelStrong: "#8d9a93",
  },
};

const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '&copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const SOURCE = "openmaptiles";

const width = (...stops: [number, number][]): ExpressionSpecification => [
  "interpolate",
  ["exponential", 1.5],
  ["zoom"],
  ...stops.flat(),
] as ExpressionSpecification;

const classIn = (...classes: string[]): ExpressionSpecification =>
  ["match", ["get", "class"], classes, true, false] as ExpressionSpecification;

const lineLayer = (
  id: string,
  classes: string[],
  color: string,
  lineWidth: ExpressionSpecification,
  minzoom = 0,
): LayerSpecification => ({
  id,
  type: "line",
  source: SOURCE,
  "source-layer": "transportation",
  minzoom,
  filter: ["all", ["==", ["geometry-type"], "LineString"], classIn(...classes)] as ExpressionSpecification,
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": color, "line-width": lineWidth },
});

export function buildMapStyle(theme: Theme): StyleSpecification {
  const c = PALETTES[theme];
  const font = ["Noto Sans Regular"];

  const layers: LayerSpecification[] = [
    { id: "background", type: "background", paint: { "background-color": c.land } },

    {
      id: "landcover-green",
      type: "fill",
      source: SOURCE,
      "source-layer": "landcover",
      filter: classIn("grass", "wood", "forest", "scrub"),
      paint: { "fill-color": c.park, "fill-antialias": false },
    },
    {
      id: "landuse-green",
      type: "fill",
      source: SOURCE,
      "source-layer": "landuse",
      filter: classIn("cemetery", "pitch", "playground", "stadium", "garden", "park", "recreation_ground"),
      paint: { "fill-color": c.park, "fill-antialias": false },
    },
    {
      id: "park",
      type: "fill",
      source: SOURCE,
      "source-layer": "park",
      paint: { "fill-color": c.park, "fill-antialias": false },
    },

    {
      id: "water",
      type: "fill",
      source: SOURCE,
      "source-layer": "water",
      paint: { "fill-color": c.water, "fill-antialias": false },
    },
    {
      id: "waterway",
      type: "line",
      source: SOURCE,
      "source-layer": "waterway",
      filter: classIn("river", "canal"),
      paint: { "line-color": c.water, "line-width": width([10, 0.6], [14, 2], [18, 10]) },
    },

    {
      id: "building",
      type: "fill",
      source: SOURCE,
      "source-layer": "building",
      minzoom: 13,
      paint: { "fill-color": c.building },
    },

    lineLayer("rail", ["rail", "transit"], c.rail, width([11, 0.6], [16, 1.6], [18, 4]), 11),

    lineLayer("path", ["path", "track", "pedestrian"], c.path, width([14, 0.7], [16, 1.3], [18, 4]), 14),
    lineLayer("service", ["service"], c.road, width([13, 0.5], [14, 1.4], [18, 10]), 13),
    lineLayer("minor", ["minor"], c.road, width([12, 0.4], [14, 2.8], [18, 20]), 12),
    lineLayer("tertiary", ["tertiary"], c.road, width([11, 0.6], [14, 4.2], [18, 28]), 11),
    lineLayer("secondary", ["secondary"], c.road, width([10, 0.8], [14, 5], [18, 32]), 10),
    lineLayer("primary", ["primary"], c.road, width([9, 0.8], [14, 6], [18, 36]), 9),
    lineLayer("motorway", ["motorway", "trunk"], c.road, width([8, 0.8], [14, 7], [18, 40]), 8),
    {
      id: "pedestrian-area",
      type: "fill",
      source: SOURCE,
      "source-layer": "transportation",
      minzoom: 14,
      filter: ["all", ["==", ["geometry-type"], "Polygon"], classIn("pedestrian", "path", "track")] as ExpressionSpecification,
      paint: { "fill-color": c.road },
    },

    {
      id: "street-names",
      type: "symbol",
      source: SOURCE,
      "source-layer": "transportation_name",
      minzoom: 14,
      filter: classIn("motorway", "trunk", "primary", "secondary", "tertiary"),
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-font": font,
        "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 18, 13],
        "text-letter-spacing": 0.04,
      },
      paint: { "text-color": c.label, "text-halo-color": c.road, "text-halo-width": theme === "light" ? 1.4 : 0 },
    },
    {
      id: "place-names",
      type: "symbol",
      source: SOURCE,
      "source-layer": "place",
      minzoom: 10,
      maxzoom: 16,
      filter: classIn("city", "town", "village", "suburb", "neighbourhood", "quarter"),
      layout: {
        "text-field": ["get", "name"],
        "text-font": font,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.12,
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 16, 14],
        "text-max-width": 8,
      },
      paint: { "text-color": c.labelStrong, "text-halo-color": c.land, "text-halo-width": 1.5 },
    },
  ];

  return {
    version: 8,
    name: `CityTrail ${theme}`,
    sources: {
      [SOURCE]: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: ATTRIBUTION },
    },
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers,
  };
}
