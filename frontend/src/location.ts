import { DEFAULT_START, GDANSK_BOUNDS } from "./config";

export type StartPoint = {
  lat: number;
  lng: number;
  label: string;
  source: "device" | "default";
  /** Why the default was used instead of the device location. */
  reason?: "denied" | "unavailable" | "outside";
};

const defaultStart = (reason: StartPoint["reason"]): StartPoint => ({ ...DEFAULT_START, source: "default", reason });

const inGdansk = (lat: number, lng: number) =>
  lat >= GDANSK_BOUNDS.minLat && lat <= GDANSK_BOUNDS.maxLat && lng >= GDANSK_BOUNDS.minLng && lng <= GDANSK_BOUNDS.maxLng;

/** Asks the browser for the visitor's location (shows the permission prompt) and falls back to ul. Długa 11. */
export function resolveStart(): Promise<StartPoint> {
  if (!("geolocation" in navigator)) return Promise.resolve(defaultStart("unavailable"));
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve(
          inGdansk(coords.latitude, coords.longitude)
            ? { lat: coords.latitude, lng: coords.longitude, label: "your location", source: "device" }
            : defaultStart("outside"),
        ),
      (err) => resolve(defaultStart(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable")),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export function describeStart(start: StartPoint): string {
  if (start.source === "device") return "Starting from your location";
  const why =
    start.reason === "denied"
      ? "location permission denied"
      : start.reason === "outside"
        ? "you appear to be outside Gdańsk"
        : "location unavailable";
  return `Starting from ${start.label} (default, ${why})`;
}
