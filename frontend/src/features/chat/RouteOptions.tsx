import { useEffect, useState } from "react";
import {
  fetchRouteOptions,
  MODE_COLOR,
  MODE_LABEL,
  type RouteOption,
  type RouteOverlay,
} from "../../api/transit";
import type { LngLat } from "../../api/routing";
import "./RouteOptions.css";

type Props = {
  from: LngLat;
  to: LngLat;
  destination: string;
  whenIso: string;
  onPick: (overlay: RouteOverlay | null) => void;
};

export function RouteOptions({ from, to, destination, whenIso, onPick }: Props) {
  const [options, setOptions] = useState<RouteOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<RouteOption["mode"] | null>(null);
  const [open, setOpen] = useState<RouteOption["mode"] | null>(null);

  useEffect(() => {
    setOptions(null);
    setFailed(false);
    setSelected(null);
    const controller = new AbortController();
    fetchRouteOptions(from, to, whenIso, controller.signal)
      .then(setOptions)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("Could not load route options:", err);
        setFailed(true);
      });
    return () => controller.abort();
  }, [from[0], from[1], to[0], to[1]]);

  function pick(option: RouteOption) {
    if (selected === option.mode) {
      setSelected(null);
      onPick(null);
      return;
    }
    setSelected(option.mode);
    onPick({
      key: Date.now(),
      mode: option.mode,
      legs: option.legs.map((l) => ({ mode: l.mode, coords: l.coords })),
    });
  }

  return (
    <section className="route-options" aria-label={`Ways to get to ${destination}`}>
      <h3>All ways to get to {destination}</h3>
      {options === null && !failed && <p className="route-note">Checking trams, buses and trains…</p>}
      {failed && <p className="route-note">Couldn’t reach the journey planner just now. Try again in a moment.</p>}
      {options?.length === 0 && <p className="route-note">No connections found for this time.</p>}
      <ul>
        {options?.map((o) => (
          <li key={o.mode}>
            <button
              type="button"
              className={selected === o.mode ? "route-card is-selected" : "route-card"}
              aria-pressed={selected === o.mode}
              onClick={() => pick(o)}
              onDoubleClick={() => setOpen(open === o.mode ? null : o.mode)}
            >
              <span className="route-dot" style={{ background: MODE_COLOR[o.mode] }} aria-hidden="true" />
              <span className="route-main">
                <strong>{MODE_LABEL[o.mode]}</strong>
                <small>
                  {o.mode === "walk"
                    ? `${o.legs[0]?.mode === "walk" && o.legs.length === 1 ? "Straight there" : ""}`.trim() ||
                      `${o.depart} → ${o.arrive}`
                    : `${o.depart} → ${o.arrive}${o.transfers > 0 ? ` · ${o.transfers} change${o.transfers > 1 ? "s" : ""}` : ""}`}
                </small>
                <small className="route-steps">
                  {o.legs
                    .map((l) => (l.mode === "walk" ? `walk ${l.minutes}′` : `${l.line ?? MODE_LABEL[l.mode]} ${l.minutes}′`))
                    .join(" › ")}
                </small>
              </span>
              <span className="route-time">{o.minutes} min</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && <p className="route-note">Showing the {MODE_LABEL[selected].toLowerCase()} route on the map. Tap it again to hide.</p>}
    </section>
  );
}
