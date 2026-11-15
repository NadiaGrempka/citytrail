import { useCallback, useState } from "react";

const KEY = "citytrail.favorites";

function load(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useFavorites(): { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void } {
  const [ids, setIds] = useState<string[]>(load);

  const toggle = useCallback((id: string) => {
    setIds((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }, []);

  return { ids, has: (id) => ids.includes(id), toggle };
}
