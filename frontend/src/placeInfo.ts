import type { Place } from "./types";

export const humanize = (slug: string) => {
  const text = slug.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const MODE_LABEL: Record<Place["transit"]["mode"], string> = { tram: "Tram", rail: "Train", bus: "Bus" };

/** e.g. "Tram Targ Drzewny, 10 min walk" */
export function transitLine(place: Place): string {
  const t = place.transit;
  return `${MODE_LABEL[t.mode]} ${t.stop}, ${t.walkMin} min walk`;
}

/** One-line summary for cards and rows. */
export function placeMeta(place: Place): string {
  return [place.hoursNote, transitLine(place)].filter(Boolean).join(" · ");
}
