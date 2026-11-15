import { useEffect, useState } from "react";
import { buildTrail, type TrailSegment } from "../../api/routing";
import type { StartPoint } from "../../location";
import type { Plan } from "../../types";

export function useTrail(plan: Plan | null, start: StartPoint | null): TrailSegment[] | null {
  const [trail, setTrail] = useState<TrailSegment[] | null>(null);

  useEffect(() => {
    setTrail(null);
    if (!plan || !start) return;
    const controller = new AbortController();
    buildTrail(plan, start, controller.signal)
      .then(setTrail)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) console.warn("Could not build the trail:", err);
      });
    return () => controller.abort();
  }, [plan, start]);

  return trail;
}
