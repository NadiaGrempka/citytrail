import type { Place } from "./types";

export const humanize = (slug: string) => {
  const text = slug.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const MODE_LABEL: Record<Place["transit"]["mode"], string> = { tram: "Tram", rail: "Train", bus: "Bus" };

export function transitLine(place: Place): string {
  const t = place.transit;
  return `${MODE_LABEL[t.mode]} ${t.stop}, ${t.walkMin} min walk`;
}

export function placeMeta(place: Place): string {
  return [place.hoursNote, transitLine(place)].filter(Boolean).join(" · ");
}
