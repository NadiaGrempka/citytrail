import { useRef, useState, type KeyboardEvent, type PointerEvent, type SubmitEvent } from "react";
import { postPlan } from "../../api/client";
import { describeStart, resolveStart, type StartPoint } from "../../location";
import type { Plan } from "../../types";

type Turn = {
  prompt: string;
  status: "locating" | "planning" | "done";
  start?: StartPoint;
  plan?: Plan;
  error?: string;
};

type Props = {
  docked: boolean;
  width: number;
  minWidth: number;
  onWidthChange: (width: number) => void;
  onResizingChange: (resizing: boolean) => void;
  onFirstSend: () => void;
  onStartResolved: (start: StartPoint) => void;
  onPlan: (plan: Plan | null) => void;
};

const KEY_STEP = 24;

export function ChatBox({ docked, width, minWidth, onWidthChange, onResizingChange, onFirstSend, onStartResolved, onPlan }: Props) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const dragRight = useRef(0);
  const startRef = useRef<Promise<StartPoint> | null>(null);

  const maxWidth = () => Math.round(window.innerWidth * 0.7);
  const clamp = (w: number) => Math.min(maxWidth(), Math.max(minWidth, w));

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const prompt = text.trim();
    if (!prompt) return;
    setText("");
    onFirstSend();
    setTurns((t) => [...t, { prompt, status: "locating" }]);
    const patch = (p: Partial<Turn>) =>
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, ...p } : x)));
    try {
      // Ask for the location once per session; later messages reuse the answer.
      startRef.current ??= resolveStart();
      const start = await startRef.current;
      onStartResolved(start);
      patch({ start, status: "planning" });
      // A follow-up extends the latest route; "New trip" clears it.
      const last = [...turns].reverse().find((t) => t.plan)?.plan;
      const previous = last
        ? { stopIds: last.stops.map((s) => s.place.id), returnHome: last.intent.returnHome }
        : undefined;
      const plan = await postPlan(prompt, start, previous);
      onPlan(plan);
      patch({ plan, status: "done" });
    } catch (err) {
      patch({ error: err instanceof Error ? err.message : String(err), status: "done" });
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
        <div className="chat-thread" aria-live="polite">
          {turns.map((t, i) => (
            <section key={i} className="chat-turn">
              <h2 className="chat-prompt">{t.prompt}</h2>
              {t.status === "locating" && <p className="chat-reply">Finding where you are…</p>}
              {t.status === "planning" && <p className="chat-reply">Planning your trip…</p>}
              {t.start && i === 0 && <p className="chat-reply chat-start">{describeStart(t.start)}</p>}
              {t.error && <p className="chat-reply">{t.error}</p>}
              {t.plan && <PlanView plan={t.plan} />}
            </section>
          ))}
        </div>
      )}

      {docked && turns.length > 0 && (
        <button type="button" className="chat-new-trip" onClick={newTrip}>
          New trip
        </button>
      )}

      <div className="chat-input">
        <textarea
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
    </div>
  );
}
