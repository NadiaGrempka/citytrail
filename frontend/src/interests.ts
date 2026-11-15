import { useCallback, useState } from "react";
import type { Place } from "./types";

/** What a visitor can say they like; each maps to place tags in the dataset, and shapes the Discover order. */
export const INTERESTS: { id: string; label: string; tags: string[] }[] = [
  {
    id: "music",
    label: "Live music",
    tags: ["concert", "rock", "jazz", "indie", "metal", "big-concert", "orchestra", "classical", "electronic", "nightlife"],
  },
  { id: "coffee", label: "Great coffee", tags: ["coffee", "specialty-coffee", "roastery", "filter-brew", "single-origin"] },
  {
    id: "art",
    label: "Art & design",
    tags: ["gallery", "design", "art-books", "interior", "curated", "polish-design", "danish-design", "folk-art", "art-house-cinema", "minimalist"],
  },
  { id: "quiet", label: "Quiet corners", tags: ["quiet", "cozy", "tiny", "green", "park"] },
  { id: "solo", label: "Good solo", tags: ["work-friendly", "browsing", "quiet", "cozy", "books", "second-hand-books", "people-watching"] },
  { id: "late", label: "Late nights", tags: ["evening", "nightlife", "date-night", "student-club"] },
];

const KEY = "citytrail.interests";
const DEFAULT_SELECTED = ["music", "coffee", "art"];

function load(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  } catch {
    /* fall through to the default */
  }
  return DEFAULT_SELECTED;
}

export function useInterests(): { selected: string[]; toggle: (id: string) => void } {
  const [selected, setSelected] = useState<string[]>(load);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* interests just won't persist */
      }
      return next;
    });
  }, []);

  return { selected, toggle };
}

/** How many of the place's tags match what the visitor said they like. */
export function interestScore(place: Place, selected: string[]): number {
  const wanted = new Set(INTERESTS.filter((i) => selected.includes(i.id)).flatMap((i) => i.tags));
  return place.tags.filter((t) => wanted.has(t)).length;
}
