import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTrail, piecesToSegments, type TrailLeg, type TrailSegment } from "../../api/routing";
import type { StartPoint } from "../../location";
import type { Plan } from "../../types";

export type Trail = {
  segments: TrailSegment[] | null;
  legs: TrailLeg[] | null;
  choices: Record<number, number>;
  choose: (legIndex: number, alternativeIndex: number) => void;
};

export function useTrail(plan: Plan | null, start: StartPoint | null): Trail {
  const [legs, setLegs] = useState<TrailLeg[] | null>(null);
  const [choices, setChoices] = useState<Record<number, number>>({});

  useEffect(() => {
    setLegs(null);
    setChoices({});
    if (!plan || !start) return;
    const controller = new AbortController();
    buildTrail(plan, start, controller.signal)
      .then(setLegs)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) console.warn("Could not build the trail:", err);
      });
    return () => controller.abort();
  }, [plan, start]);

  const segments = useMemo(
    () =>
      legs?.flatMap((leg, i) =>
        leg.alternatives.length > 0
          ? piecesToSegments(leg.alternatives[choices[i] ?? 0].pieces)
          : leg.segments,
      ) ?? null,
    [legs, choices],
  );

  const choose = useCallback((legIndex: number, alternativeIndex: number) => {
    setChoices((c) => ({ ...c, [legIndex]: alternativeIndex }));
  }, []);

  return { segments, legs, choices, choose };
}
