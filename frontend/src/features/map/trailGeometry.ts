import type { LngLat, TrailSegment } from "../../api/routing";

export type TrailFeature = {
  type: "Feature";
  properties: { dashed: boolean };
  geometry: { type: "LineString"; coordinates: LngLat[] };
};
export type TrailCollection = { type: "FeatureCollection"; features: TrailFeature[] };

export const EMPTY_TRAIL: TrailCollection = { type: "FeatureCollection", features: [] };

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

function distanceM(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function lengthM(coords: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += distanceM(coords[i - 1], coords[i]);
  return total;
}

function head(coords: LngLat[], limitM: number): LngLat[] {
  const out: LngLat[] = [coords[0]];
  let left = limitM;
  for (let i = 1; i < coords.length; i++) {
    const seg = distanceM(coords[i - 1], coords[i]);
    if (seg >= left) {
      const t = seg === 0 ? 0 : left / seg;
      out.push([
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
      ]);
      return out;
    }
    out.push(coords[i]);
    left -= seg;
  }
  return out;
}

export function toCollection(segments: TrailSegment[], lengths: number[], revealM: number): TrailCollection {
  const features: TrailFeature[] = [];
  let left = revealM;
  segments.forEach((s, i) => {
    if (left <= 0) return;
    const coords = left >= lengths[i] ? s.coords : head(s.coords, left);
    features.push({
      type: "Feature",
      properties: { dashed: !s.routed },
      geometry: { type: "LineString", coordinates: coords },
    });
    left -= lengths[i];
  });
  return { type: "FeatureCollection", features };
}
