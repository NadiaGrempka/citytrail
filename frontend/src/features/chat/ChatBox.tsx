import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type SubmitEvent } from "react";
import { createTrip, postPlan } from "../../api/client";
import { describeStart, resolveStart, type StartPoint } from "../../location";
import { ClockIcon, PinIcon, SparkIcon, CheckIcon } from "../../components/icons";
import { startLabel, timeLabel, tripTime, type Settings } from "../../settings";
import type { Plan, TripView } from "../../types";
import { ecoSummary } from "./eco";
import { RouteOptions } from "./RouteOptions";
import type { RouteOverlay } from "../../api/transit";

type Turn = {
  prompt: string;
  status: "locating" | "planning" | "done";
  start?: StartPoint;
  plan?: Plan;
  error?: string;
  /** True for a trip opened from "My trips": it is already saved. */
  saved?: boolean;
};

/** A trip the visitor opened from the menu; key changes on every open so the same trip can be reopened. */
/** A message handed to the guide from another screen (key changes on every request). */
export type GuideRequest = { key: number; text: string; send: boolean };

export type OpenedTrip = { key: number; view: TripView };

type Props = {
  docked: boolean;
  width: number;
  minWidth: number;
  onWidthChange: (width: number) => void;
  onResizingChange: (resizing: boolean) => void;
  onFirstSend: () => void;
  onStartResolved: (start: StartPoint) => void;
  onPlan: (plan: Plan | null) => void;
  /** The route option picked in the chat (drawn on the map), or null to clear it. */
  onRouteOption: (overlay: RouteOverlay | null) => void;
  openedTrip: OpenedTrip | null;
  settings: Settings;
  /** Text sent in from another screen: either sent straight away or placed in the input box. */
  request: GuideRequest | null;
  onEditSettings: () => void;
  onTripSaved: () => void;
};

const KEY_STEP = 24;

/** The next occurrence of the trip time (today, or tomorrow when it has already passed), as an ISO string. */
function departureIso(settings: Settings): string {
  const [h, m] = tripTime(settings).split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now() - 5 * 60_000) d.setDate(d.getDate() + 1);
  return d.toISOString();
}
const QUICK_PROMPTS = ["Live music tonight", "Coffee nearby"];

export function ChatBox({ docked, width, minWidth, onWidthChange, onResizingChange, onFirstSend, onStartResolved, onPlan, onRouteOption, openedTrip, settings, request, onEditSettings, onTripSaved }: Props) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const dragRight = useRef(0);
  const startRef = useRef<Promise<StartPoint> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // The plan that was last saved from the header button; a newer plan makes the button available again.
  const [savedPlan, setSavedPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const latestPlan = [...turns].reverse().find((t) => t.plan)?.plan ?? null;
  const latestStart = [...turns].reverse().find((t) => t.start)?.start;

  // A different start choice in Settings means the next message asks again instead of reusing the old answer.
  useEffect(() => {
    startRef.current = null;
  }, [settings.startMode, settings.manualLat, settings.manualLng]);

  // Opening a saved trip replaces the conversation with that trip; follow-ups then extend it.
  useEffect(() => {
    if (!openedTrip) return;
    const { trip, plan } = openedTrip.view;
    onFirstSend();
    if (trip.startLat !== 0 && trip.startLng !== 0) {
      const start: StartPoint = { lat: trip.startLat, lng: trip.startLng, label: "your saved start", source: "default" };
      startRef.current = Promise.resolve(start);
      onStartResolved(start);
    }
    setTurns([{ prompt: trip.title, status: "done", plan, saved: true }]);
    setSavedPlan(plan);
    onPlan(plan);
    // Only a new open (new key) should reset the conversation, not changes to the callbacks.
  }, [openedTrip?.key]);

  // A request from another screen ("Show me the way", "Ask the guide").
  useEffect(() => {
    if (!request) return;
    if (request.send) {
      void send(request.text);
    } else {
      setText(request.text);
      inputRef.current?.focus();
    }
    // Only a new request (new key) should act, not changes to the handlers.
  }, [request?.key]);

  const maxWidth = () => Math.round(window.innerWidth * 0.7);
  const clamp = (w: number) => Math.min(maxWidth(), Math.max(minWidth, w));

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const prompt = text.trim();
    if (!prompt) return;
    setText("");
    void send(prompt);
  }

  async function send(prompt: string) {
    onFirstSend();
    setTurns((t) => [...t, { prompt, status: "locating" }]);
    const patch = (p: Partial<Turn>) =>
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, ...p } : x)));
    try {
      // Ask for the location once per session; later messages reuse the answer.
      startRef.current ??= resolveStart(
        settings.startMode,
        settings.manualLat !== null && settings.manualLng !== null
          ? { lat: settings.manualLat, lng: settings.manualLng, label: settings.manualAddress.trim() }
          : null,
      );
      const start = await startRef.current;
      onStartResolved(start);
      patch({ start, status: "planning" });
      // A follow-up extends the latest route; "New trip" clears it.
      const last = [...turns].reverse().find((t) => t.plan)?.plan;
      const previous = last
        ? { stopIds: last.stops.map((s) => s.place.id), returnHome: last.intent.returnHome }
        : undefined;
      const plan = await postPlan(prompt, start, previous, {
        startTime: tripTime(settings),
        walkPace: settings.walkPace,
      });
      onPlan(plan);
      patch({ plan, status: "done" });
    } catch (err) {
      patch({ error: err instanceof Error ? err.message : String(err), status: "done" });
    }
  }

  async function saveTrip() {
    if (!latestPlan || saving) return;
    setSaving(true);
    try {
      const prompt = turns.map((t) => t.prompt).join(" → ");
      await createTrip({
        stopIds: latestPlan.stops.map((s) => s.place.id),
        returnHome: latestPlan.returnLeg !== null,
        startLat: latestStart?.lat,
        startLng: latestStart?.lng,
        prompt,
      });
      setSavedPlan(latestPlan);
      onTripSaved();
    } catch {
      setTurns((t) => [...t, { prompt: "Save trip", status: "done", error: "Could not save the trip. Is the backend running?" }]);
    } finally {
      setSaving(false);
    }
  }

  function newTrip() {
    setTurns([]);
    onPlan(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function onResizeStart(e: PointerEvent<HTMLDivElement>) {
    if (!formRef.current) return;
    dragRight.current = formRef.current.getBoundingClientRect().right;
    e.currentTarget.setPointerCapture(e.pointerId);
    onResizingChange(true);
  }

  function onResizeMove(e: PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onWidthChange(clamp(dragRight.current - e.clientX));
  }

  function onResizeEnd(e: PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    onResizingChange(false);
  }

  function onResizeKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") onWidthChange(clamp(width + KEY_STEP));
    else if (e.key === "ArrowRight") onWidthChange(clamp(width - KEY_STEP));
    else return;
    e.preventDefault();
  }

  return (
    <form
      ref={formRef}
      className={docked ? "chat chat--docked" : "chat"}
      style={docked ? { width } : undefined}
      onSubmit={onSubmit}
    >
      {docked && (
        <div
          className="chat-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth()}
          aria-valuenow={width}
          tabIndex={0}
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          onKeyDown={onResizeKey}
        />
      )}

      {docked && (
        <header className="chat-header">
          <span className="chat-avatar" aria-hidden="true">
            <SparkIcon size={20} />
          </span>
          <div className="chat-header-text">
            <strong>Your city guide</strong>
            <small>Here whenever you’re curious</small>
          </div>
          <button
            type="button"
            className="chat-save"
            onClick={saveTrip}
            disabled={!latestPlan || saving || savedPlan === latestPlan}
          >
            {savedPlan !== null && savedPlan === latestPlan ? (
              <>
                <CheckIcon size={14} /> Saved
              </>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save trip"
            )}
          </button>
        </header>
      )}

      {docked && (
        <button type="button" className="chat-context" onClick={onEditSettings} aria-label="Edit trip settings">
          <span>
            <PinIcon size={15} /> {startLabel(settings)}
          </span>
          <span>
            <ClockIcon size={15} /> {timeLabel(settings)}
          </span>
          <span className="chat-context-edit">Edit</span>
        </button>
      )}

      {docked && (
        <div className="chat-thread" aria-live="polite">
          {turns.map((t, i) => (
            <section key={i} className="chat-turn">
              <h2 className="chat-prompt">{t.prompt}</h2>
              <span className="chat-guide-label">Guide</span>
              {t.status === "locating" && <p className="chat-reply">Finding where you are…</p>}
              {t.status === "planning" && <p className="chat-reply">Planning your trip…</p>}
              {t.start && i === 0 && <p className="chat-reply chat-start">{describeStart(t.start)}</p>}
              {t.error && <p className="chat-reply">{t.error}</p>}
              {t.plan && (
                <>
<PlanView plan={t.plan} />
              {t.plan.stops.length === 1 && t.plan === latestPlan && latestStart && (
                <RouteOptions
                  from={[latestStart.lng, latestStart.lat]}
                  to={[t.plan.stops[0].place.lng, t.plan.stops[0].place.lat]}
                  destination={t.plan.stops[0].place.name}
                  whenIso={departureIso(settings)}
                  onPick={onRouteOption}
                />
              )}
                </>
              )}
            </section>
          ))}
        </div>
      )}

      {docked && turns.length > 0 && (
        <button type="button" className="chat-new-trip" onClick={newTrip}>
          New trip
        </button>
      )}

      <div className="chat-chips">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            className="chat-chip"
            onClick={() => {
              setText(q);
              inputRef.current?.focus();
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={docked ? "What else is on the way?" : "What would you like to explore today?"}
          rows={docked ? 1 : 3}
          aria-label="Your trip wish"
        />
        <button type="submit" className="chat-send" aria-label="Send" disabled={!text.trim()}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </form>
  );
}

function PlanView({ plan }: { plan: Plan }) {
  const eco = ecoSummary(plan);

  return (
    <div className="chat-reply">
      <p>
        {plan.date}, {plan.startTime} to {plan.endTime} (about {plan.totalMinutes} min, understood by {plan.parsedBy})
      </p>
      <ol>
        {plan.stops.map((s) => (
          <li key={s.place.id}>
            {s.arrive} {s.place.name} <small>({s.legFromPrevious.via})</small>
            {s.event && <small> - {s.event.title}</small>}
            {s.notes.map((n) => (
              <small key={n}> {n}</small>
            ))}
          </li>
        ))}
      </ol>
      {plan.returnLeg && (
        <p>
          Ride home: {plan.returnLeg.via} (about {plan.returnLeg.minutes} min)
        </p>
      )}
      {plan.warnings.map((w) => (
        <p key={w}>{w}</p>
      ))}
      {eco && (
        <p className="eco-badge" title="Rough estimate: car 170 g/km, city transit 60 g/km, walking 0">
          {eco.savedGrams > 0
            ? `About ${eco.savedGrams} g CO₂ saved vs driving this route`
            : "About the same CO₂ as driving this route"}
        </p>
      )}
    </div>
  );
}
