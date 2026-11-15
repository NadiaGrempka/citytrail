import { useCallback, useState } from "react";

export type StartMode = "device" | "default" | "manual";
export type TimeMode = "now" | "set";
export type WalkPace = "slow" | "normal" | "fast";

export type Settings = {
  /** Where trips start: the visitor's location, the fixed default (ul. Długa 11), or an address they typed. */
  startMode: StartMode;
  /** The address the visitor typed and found; coordinates are set only after a successful lookup. */
  manualAddress: string;
  manualLat: number | null;
  manualLng: number | null;
  /** "now" plans from the current time of day, "set" from startTime. */
  timeMode: TimeMode;
  /** "HH:mm" */
  startTime: string;
  walkPace: WalkPace;
};

export const DEFAULT_SETTINGS: Settings = {
  startMode: "device",
  manualAddress: "",
  manualLat: null,
  manualLng: null,
  timeMode: "now",
  startTime: "19:00",
  walkPace: "normal",
};

/** Short label for the start choice, shown in the chat's trip-context bar. */
export function startLabel(s: Settings): string {
  if (s.startMode === "device") return "Current location";
  if (s.startMode === "default") return "ul. Długa 11";
  return s.manualAddress.trim() || "Set a start point";
}

export function timeLabel(s: Settings): string {
  return s.timeMode === "now" ? "Leaving now" : `Leaving ${s.startTime}`;
}

/** The "HH:mm" the planner should start from. */
export function tripTime(s: Settings): string {
  if (s.timeMode === "set") return s.startTime;
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const KEY = "citytrail.settings";

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>;
    const manualOk = typeof raw.manualLat === "number" && typeof raw.manualLng === "number";
    return {
      startMode: raw.startMode === "default" || raw.startMode === "manual" ? raw.startMode : "device",
      manualAddress: typeof raw.manualAddress === "string" ? raw.manualAddress : "",
      manualLat: manualOk ? (raw.manualLat as number) : null,
      manualLng: manualOk ? (raw.manualLng as number) : null,
      timeMode: raw.timeMode === "set" ? "set" : "now",
      startTime:
        typeof raw.startTime === "string" && /^\d{2}:\d{2}$/.test(raw.startTime)
          ? raw.startTime
          : DEFAULT_SETTINGS.startTime,
      walkPace: raw.walkPace === "slow" || raw.walkPace === "fast" ? raw.walkPace : "normal",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(load);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* settings just won't persist */
      }
      return next;
    });
  }, []);

  return [settings, update];
}
