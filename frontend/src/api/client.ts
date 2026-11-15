import type { District, Place, Plan, Trip, TripView } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const fetchPlaces = () => request<Place[]>("/places");
export const fetchDistricts = () => request<District[]>("/districts");

export type PreviousRoute = { stopIds: string[]; returnHome: boolean };

export type PlanOptions = { startTime?: string; walkPace?: string };

export const postPlan = (
  text: string,
  start?: { lat: number; lng: number },
  previous?: PreviousRoute,
  options?: PlanOptions,
) =>
  request<Plan>("/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      startLat: start?.lat,
      startLng: start?.lng,
      previousStopIds: previous?.stopIds,
      previousReturnHome: previous?.returnHome,
      startTime: options?.startTime,
      walkPace: options?.walkPace,
    }),
  });

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export type NewTrip = {
  title?: string;
  stopIds: string[];
  returnHome: boolean;
  startLat?: number;
  startLng?: number;
  prompt?: string;
};

export const listTrips = () => request<Trip[]>("/trips");
export const createTrip = (trip: NewTrip) => request<Trip>("/trips", json("POST", trip));
export const getTrip = (id: string) => request<TripView>(`/trips/${encodeURIComponent(id)}`);
export const renameTrip = (id: string, title: string) =>
  request<Trip>(`/trips/${encodeURIComponent(id)}`, json("PATCH", { title }));
export const deleteTrip = (id: string) => request<void>(`/trips/${encodeURIComponent(id)}`, { method: "DELETE" });
export const deleteAllTrips = () => request<void>("/trips", { method: "DELETE" });

export type Info = { aiParser: boolean; model: string | null };
export const fetchInfo = () => request<Info>("/info");
