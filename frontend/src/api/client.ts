import type { District, Place, Plan } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
      // response had no JSON body; keep the status text
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const fetchPlaces = () => request<Place[]>("/places");
export const fetchDistricts = () => request<District[]>("/districts");

/** The route built so far; sent with a follow-up so the new stops are added to it. */
export type PreviousRoute = { stopIds: string[]; returnHome: boolean };

export const postPlan = (text: string, start?: { lat: number; lng: number }, previous?: PreviousRoute) =>
  request<Plan>("/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      startLat: start?.lat,
      startLng: start?.lng,
      previousStopIds: previous?.stopIds,
      previousReturnHome: previous?.returnHome,
    }),
  });
