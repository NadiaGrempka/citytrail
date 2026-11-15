import type { StartPoint } from "../location";
import { fetchTransitAlternatives, type PathPiece, type TransitAlternative } from "./transit";
import type { Plan } from "../types";

export type LngLat = [number, number];

export type TrailSegment = {
  mode: "walk" | "transit";
  coords: LngLat[];
  routed: boolean;
};

export type TrailLeg = {
  segments: TrailSegment[];
  alternatives: TransitAlternative[];
};

export function piecesToSegments(pieces: PathPiece[]): TrailSegment[] {
  return pieces.map((p): TrailSegment => ({
    mode: p.mode === "walk" ? "walk" : "transit",
    coords: p.coords,
    routed: true,
  }));
}

const FOOT_ROUTER = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

type OsrmResponse = { code: string; routes?: { geometry: { coordinates: LngLat[] } }[] };

async function footRoute(from: LngLat, to: LngLat, signal: AbortSignal): Promise<LngLat[]> {
  const url = `${FOOT_ROUTER}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Routing service answered ${res.status}`);
  const body = (await res.json()) as OsrmResponse;
  const route = body.routes?.[0];
  if (body.code !== "Ok" || !route) throw new Error("No walking route found");
  return route.geometry.coordinates;
}

export async function buildTrail(plan: Plan, start: StartPoint, signal: AbortSignal): Promise<TrailLeg[]> {
  const origin: LngLat = [start.lng, start.lat];
  const points: LngLat[] = [origin, ...plan.stops.map((s): LngLat => [s.place.lng, s.place.lat])];
  const legs = plan.stops.map((s) => s.legFromPrevious);
  if (plan.returnLeg) {
    points.push(origin);
    legs.push(plan.returnLeg);
  }

  const departures = [plan.startTime, ...plan.stops.map((st) => st.depart)];

  return Promise.all(
    legs.map(async (leg, i): Promise<TrailLeg> => {
      const from = points[i];
      const to = points[i + 1];
      if (leg.mode === "walk") {
        try {
          const coords: LngLat[] = [from, ...(await footRoute(from, to, signal)), to];
          return { segments: [{ mode: "walk", coords, routed: true }], alternatives: [] };
        } catch (err) {
          if (signal.aborted) throw err;
          console.warn("Walking route failed, drawing a straight line instead:", err);
        }
      } else {
        try {
          const alternatives = await fetchTransitAlternatives(from, to, departureIso(plan.date, departures[i]), signal);
          return { segments: piecesToSegments(alternatives[0].pieces), alternatives };
        } catch (err) {
          if (signal.aborted) throw err;
          console.warn("Transit route failed, drawing a straight line instead:", err);
        }
      }
      return { segments: [{ mode: leg.mode, coords: [from, to], routed: false }], alternatives: [] };
    }),
  );
}

function departureIso(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  return (Number.isNaN(d.getTime()) ? new Date() : d).toISOString();
}
