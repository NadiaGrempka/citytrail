import { useEffect, useState, type SubmitEvent } from "react";
import { deleteAllTrips, fetchInfo, listTrips, type Info } from "../api/client";
import { ThemeButton } from "../components/ThemeButton";
import { ClockIcon, MoonIcon, PinIcon, SunIcon } from "../components/icons";
import { geocodeGdansk } from "../geocode";
import type { Settings, StartMode, TimeMode, WalkPace } from "../settings";
import type { Theme } from "../theme";
import "./SettingsPage.css";

type Props = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onResetPanelWidth: () => void;
  onTripsCleared: () => void;
};

const START_CHOICES: { id: StartMode; label: string }[] = [
  { id: "device", label: "Current location" },
  { id: "default", label: "ul. Długa 11" },
  { id: "manual", label: "Set manually" },
];
const TIME_CHOICES: { id: TimeMode; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "set", label: "Set a time" },
];
const PACE_CHOICES: { id: WalkPace; label: string }[] = [
  { id: "slow", label: "Slow" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
];

export function SettingsPage({ settings, onChange, theme, onThemeChange, onResetPanelWidth, onTripsCleared }: Props) {
  const [draft, setDraft] = useState(settings.manualAddress);
  const [lookup, setLookup] = useState<"idle" | "searching" | "notfound" | "error">("idle");
  const [info, setInfo] = useState<Info | null | "unreachable">(null);
  const [tripCount, setTripCount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInfo()
      .then((i) => !cancelled && setInfo(i))
      .catch(() => !cancelled && setInfo("unreachable"));
    listTrips()
      .then((t) => !cancelled && setTripCount(t.length))
      .catch(() => !cancelled && setTripCount(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const hasManualPoint = settings.manualLat !== null && settings.manualAddress.trim() !== "";

  async function findAddress(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = draft.trim();
    if (!query) return;
    setLookup("searching");
    try {
      const hit = await geocodeGdansk(query);
      if (!hit) {
        setLookup("notfound");
        return;
      }
      onChange({ manualAddress: query, manualLat: hit.lat, manualLng: hit.lng });
      setLookup("idle");
    } catch {
      setLookup("error");
    }
  }

  async function clearTrips() {
    try {
      await deleteAllTrips();
      setTripCount(0);
      onTripsCleared();
      setMessage("Saved trips cleared.");
    } catch {
      setMessage("Could not clear trips. Is the backend running?");
    }
    setConfirming(false);
  }

  return (
    <div className="page-content">
      <p className="eyebrow">Trip settings</p>
      <h1 className="page-title">Set up your outing</h1>
      <p className="page-lede">Choose where your guide should start and when you’re planning to go.</p>

      <section className="panel">
        <PanelHeading
          icon={<PinIcon size={22} />}
          title="Start location"
          hint="Used for walking times and route suggestions."
        />
        <Segmented
          label="Start location"
          choices={START_CHOICES}
          value={settings.startMode}
          onSelect={(startMode) => onChange({ startMode })}
        />
        {settings.startMode === "manual" && (
          <form className="field" onSubmit={findAddress}>
            <label htmlFor="start-address">Start address or area</label>
            <div className="field-row">
              <input
                id="start-address"
                value={draft}
                placeholder="e.g. Dworzec Główny"
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={!draft.trim() || lookup === "searching"}>
                {lookup === "searching" ? "Searching…" : "Find"}
              </button>
            </div>
            {!hasManualPoint && lookup === "idle" && (
              <p className="field-hint">Add a start point so the guide can plan from there.</p>
            )}
            {hasManualPoint && lookup === "idle" && (
              <p className="field-hint">Starting from {settings.manualAddress}. Plans use this point.</p>
            )}
            {lookup === "notfound" && <p className="field-hint">Couldn’t find that in Gdańsk. Try a street or area name.</p>}
            {lookup === "error" && <p className="field-hint">Address search is unavailable right now. Check your connection.</p>}
          </form>
        )}
      </section>

      <section className="panel">
        <PanelHeading
          icon={<ClockIcon size={22} />}
          title="Trip time"
          hint="Helps the guide focus on places open when you arrive."
        />
        <Segmented
          label="Trip time"
          choices={TIME_CHOICES}
          value={settings.timeMode}
          onSelect={(timeMode) => onChange({ timeMode })}
        />
        {settings.timeMode === "set" && (
          <div className="field">
            <label htmlFor="start-time">Departure</label>
            <input
              id="start-time"
              type="time"
              value={settings.startTime}
              onChange={(e) => e.target.value && onChange({ startTime: e.target.value })}
            />
          </div>
        )}
      </section>

      <section className="panel">
        <PanelHeading icon={<PinIcon size={22} />} title="Walking pace" hint="Changes the walking time estimates." />
        <Segmented
          label="Walking pace"
          choices={PACE_CHOICES}
          value={settings.walkPace}
          onSelect={(walkPace) => onChange({ walkPace })}
        />
      </section>

      <section className="panel">
        <PanelHeading
          icon={theme === "light" ? <SunIcon size={22} /> : <MoonIcon size={22} />}
          title="Appearance"
          hint={theme === "light" ? "Light theme" : "Dark theme"}
          action={<ThemeButton theme={theme} onChange={onThemeChange} labelled />}
        />
      </section>

      <section className="panel">
        <PanelHeading
          icon={<SunIcon size={22} />}
          title="Guide and data"
          hint={
            info === null
              ? "Checking which parser reads your requests…"
              : info === "unreachable"
                ? "Backend unreachable"
                : info.aiParser
                  ? `AI parser on (${info.model})`
                  : "Keyword parser (AI is off)"
          }
        />
        <div className="panel-actions">
          {confirming ? (
            <>
              <span>
                Delete {tripCount ?? "all"} saved trip{tripCount === 1 ? "" : "s"}?
              </span>
              <button type="button" className="btn-danger" onClick={clearTrips}>
                Yes, delete
              </button>
              <button type="button" className="btn-small" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-danger"
              disabled={tripCount === 0}
              onClick={() => {
                setMessage(null);
                setConfirming(true);
              }}
            >
              Clear saved trips
            </button>
          )}
          <button type="button" className="btn-small" onClick={onResetPanelWidth}>
            Reset chat panel width
          </button>
        </div>
        {message && <p className="field-hint">{message}</p>}
      </section>
    </div>
  );
}

function PanelHeading({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <span className="panel-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
      {action && <div className="panel-action">{action}</div>}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  choices,
  value,
  onSelect,
}: {
  label: string;
  choices: { id: T; label: string }[];
  value: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          className={value === c.id ? "is-active" : undefined}
          aria-pressed={value === c.id}
          onClick={() => onSelect(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
