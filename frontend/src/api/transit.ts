import type { LngLat } from "./routing";

// Transitous is a free, community-run journey planner (MOTIS) that has Gdańsk's tram, bus and rail timetables.
// Fair-use service: fine for a demo. https://transitous.org/api/
const PLAN_URL = "https://api.transitous.org/api/v5/plan";

export type RouteMode = "walk" | "tram" | "bus" | "train";

export const MODE_LABEL: Record<RouteMode, string> = { walk: "Walk", tram: "Tram", bus: "Bus", train: "Train" };
export const MODE_COLOR: Record<RouteMode, string> = {
  walk: "#ff6b4a",
  tram: "#e03a3e",
  bus: "#1f78d1",
  train: "#7a4fd0",
};
const MODE_ORDER: RouteMode[] = ["walk", "tram", "bus", "train"];

export type RouteLeg = {
  mode: RouteMode;
  minutes: number;
  from: string;
  to: string;
  /** Line number or name, e.g. "9" or "SKM". */
  line?: string;
  headsign?: string;
  coords: LngLat[];
};

export type RouteOption = {
  mode: RouteMode;
  minutes: number;
  transfers: number;
  depart: string; // HH:mm
  arrive: string; // HH:mm
  legs: RouteLeg[];
};

/** What the map draws when an option is picked. */
export type RouteOverlay = { key: number; mode: RouteMode; legs: Pick<RouteLeg, "mode" | "coords">[] };

type ApiPlace = { name?: string };
type ApiLeg = {
  mode: string;
  duration: number;
  from?: ApiPlace;
  to?: ApiPlace;
  routeShortName?: string;
  displayName?: string;
  headsign?: string;
  legGeometry?: { points: string; precision?: number };
};
type ApiItinerary = { duration: number; startTime: string; endTime: string; transfers: number; legs: ApiLeg[] };
type ApiPlan = { direct?: ApiItinerary[]; itineraries?: ApiItinerary[] };

/** Decodes a Google-encoded polyline into [lng, lat] pairs. */
export function decodePolyline(encoded: string, precision = 6): LngLat[] {
  const factor = 10 ** precision;
  const out: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (let axis = 0; axis < 2; axis++) {
      let shift = 0;
      let result = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    out.push([lng / factor, lat / factor]);
  }
  return out;
}

function legMode(mode: string): RouteMode | null {
  if (mode === "WALK") return "walk";
  if (mode === "TRAM") return "tram";
  if (mode === "BUS" || mode === "COACH") return "bus";
  if (mode === "BIKE" || mode === "CAR" || mode === "RENTAL") return null;
  return "train"; // SUBURBAN (SKM), REGIONAL_RAIL, SUBWAY, ...
}

const clock = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function toOption(mode: RouteMode, it: ApiItinerary): RouteOption {
  const legs = it.legs.flatMap((l): RouteLeg[] => {
    const m = legMode(l.mode);
    if (!m) return [];
    const g = l.legGeometry;
    return [
      {
        mode: m,
        minutes: Math.max(1, Math.round(l.duration / 60)),
        from: l.from?.name ?? "",
        to: l.to?.name ?? "",
        line: m === "walk" ? undefined : (l.displayName ?? l.routeShortName),
        headsign: l.headsign || undefined,
        coords: g ? decodePolyline(g.points, g.precision ?? 6) : [],
      },
    ];
  });
  return {
    mode,
    minutes: Math.max(1, Math.round(it.duration / 60)),
    transfers: it.transfers,
    depart: clock(it.startTime),
    arrive: clock(it.endTime),
    legs,
  };
}

async function plan(from: LngLat, to: LngLat, whenIso: string, transitModes: string, signal: AbortSignal): Promise<ApiPlan> {
  const params = new URLSearchParams({
    fromPlace: `${from[1]},${from[0]}`,
    toPlace: `${to[1]},${to[0]}`,
    time: whenIso,
    transitModes, // empty = no transit, only the direct walking route
    directModes: "WALK",
    detailedLegs: "true",
  });
  const res = await fetch(`${PLAN_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Journey planner answered ${res.status}`);
  return (await res.json()) as ApiPlan;
}

const fastest = (list: ApiItinerary[] | undefined) =>
  [...(list ?? [])].sort((a, b) => a.duration - b.duration)[0];

/**
 * Every way of getting from `from` to `to`: walking, and the quickest tram, bus and train connection.
 * A mode with no connection is simply left out (e.g. no tram line serves both ends, or walking is quicker).
 */
export async function fetchRouteOptions(
  from: LngLat,
  to: LngLat,
  whenIso: string,
  signal: AbortSignal,
): Promise<RouteOption[]> {
  const requests: [RouteMode, string][] = [
    ["walk", ""],
    ["tram", "TRAM"],
    ["bus", "BUS"],
    ["train", "RAIL"],
  ];
  const settled = await Promise.allSettled(requests.map(([, modes]) => plan(from, to, whenIso, modes, signal)));
  if (settled.every((r) => r.status === "rejected")) {
    throw settled[0].status === "rejected" ? settled[0].reason : new Error("Journey planner unavailable");
  }
  const options: RouteOption[] = [];
  settled.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const mode = requests[i][0];
    const itinerary = mode === "walk" ? fastest(r.value.direct) : fastest(r.value.itineraries);
    if (!itinerary) return;
    const option = toOption(mode, itinerary);
    // A "tram" result that is really just a walk (no transit leg in it) is not a tram option.
    if (mode !== "walk" && !option.legs.some((l) => l.mode === mode || (mode === "train" && l.mode === "train"))) return;
    options.push(option);
  });
  return options.sort((a, b) => MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode));
}
