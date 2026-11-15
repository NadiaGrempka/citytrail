import { useEffect, useRef, useState } from "react";
import type { Theme } from "../../theme";

type View = "recent" | "trips" | "settings";

const VIEWS: { id: View; label: string; empty: string }[] = [
  { id: "recent", label: "Recent chats", empty: "Your past conversations will show up here." },
  { id: "trips", label: "My trips", empty: "Trips you save will show up here." },
  { id: "settings", label: "Settings", empty: "Settings are coming soon." },
];

type Props = { theme: Theme; onThemeChange: (t: Theme) => void };

export function MenuButton({ theme, onThemeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open && !view) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setView(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setView(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, view]);

  const current = VIEWS.find((v) => v.id === view);

  return (
    <div ref={rootRef} className="menu">
      <button
        type="button"
        className="menu-button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setView(null);
          setOpen((o) => !o);
        }}
      >
        <span className="menu-burger" aria-hidden="true" />
      </button>

      {open && (
        <div className="menu-popover" role="menu">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setView(v.id);
                setOpen(false);
              }}
            >
              {v.label}
            </button>
          ))}
          <div className="menu-theme" role="group" aria-label="Theme">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={theme === t ? "menu-theme-option is-active" : "menu-theme-option"}
                aria-pressed={theme === t}
                onClick={() => onThemeChange(t)}
              >
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
      )}

      {current && (
        <section className="menu-popover menu-sheet" aria-label={current.label}>
          <h2>{current.label}</h2>
          <p>{current.empty}</p>
        </section>
      )}
    </div>
  );
}
