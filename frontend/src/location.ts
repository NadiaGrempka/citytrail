import { DEFAULT_START, GDANSK_BOUNDS } from "./config";

export type StartPoint = {
  lat: number;
  lng: number;
  label: string;
  source: "device" | "default";
  reason?: "denied" | "unavailable" | "outside" | "chosen";
};

const defaultStart = (reason: StartPoint["reason"]): StartPoint => ({ ...DEFAULT_START, source: "default", reason });

const inGdansk = (lat: number, lng: number) =>
  lat >= GDANSK_BOUNDS.minLat && lat <= GDANSK_BOUNDS.maxLat && lng >= GDANSK_BOUNDS.minLng && lng <= GDANSK_BOUNDS.maxLng;

export function resolveStart(
  mode: "device" | "default" | "manual" = "device",
  manual?: { lat: number; lng: number; label: string } | null,
): Promise<StartPoint> {
  if (mode === "manual" && manual) {
    return Promise.resolve({ ...manual, source: "default", reason: "chosen" });
  }
  if (mode === "default" || mode === "manual") {
    return Promise.resolve({ ...DEFAULT_START, source: "default", reason: "chosen" });
  }
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
  if (start.reason === "chosen") return `Starting from ${start.label} (your Settings)`;
  const why =
    start.reason === "denied"
      ? "location permission denied"
      : start.reason === "outside"
        ? "you appear to be outside Gdańsk"
        : "location unavailable";
  return `Starting from ${start.label} (default, ${why})`;
}
