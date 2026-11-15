import type { StartPoint } from "../location";
import type { Plan } from "../types";

export type LngLat = [number, number];

/** One leg of the trail. `routed` is true when the line follows real streets. */
export type TrailSegment = {
  mode: "walk" | "transit";
  coords: LngLat[];
  routed: boolean;
};

// Free public walking router run by the OpenStreetMap community (no key, CORS enabled).
// Fair-use service: fine for a demo, host your own OSRM/Valhalla for real traffic.
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

/**
 * Builds the trail for a plan: start -> each stop -> back to the start (when the plan has a ride home).
 * Walking legs follow real streets; transit legs and failed lookups are straight lines.
 */
export async function buildTrail(plan: Plan, start: StartPoint, signal: AbortSignal): Promise<TrailSegment[]> {
  const origin: LngLat = [start.lng, start.lat];
  const points: LngLat[] = [origin, ...plan.stops.map((s): LngLat => [s.place.lng, s.place.lat])];
  const legs = plan.stops.map((s) => s.legFromPrevious);
  if (plan.returnLeg) {
    points.push(origin);
    legs.push(plan.returnLeg);
  }

  return Promise.all(
    legs.map(async (leg, i): Promise<TrailSegment> => {
      const from = points[i];
      const to = points[i + 1];
      if (leg.mode === "walk") {
        try {
          // Routes snap to the nearest street, so join the exact endpoints on for a clean connection.
          return { mode: "walk", coords: [from, ...(await footRoute(from, to, signal)), to], routed: true };
        } catch (err) {
          if (signal.aborted) throw err;
          console.warn("Walking route failed, drawing a straight line instead:", err);
        }
      }
      return { mode: leg.mode, coords: [from, to], routed: false };
    }),
  );
}
