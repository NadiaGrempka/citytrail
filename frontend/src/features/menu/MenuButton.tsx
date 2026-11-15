import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { CompassIcon, HeartIcon, MapIcon, RouteIcon, SettingsIcon, UserIcon } from "../../components/icons";
import "./MenuButton.css";

export type Page = "map" | "discover" | "place" | "saved" | "trips" | "prefs" | "settings";

const ITEMS: { id: Page; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: "map", label: "Guide & map", Icon: MapIcon },
  { id: "discover", label: "Discover", Icon: CompassIcon },
  { id: "saved", label: "Saved places", Icon: HeartIcon },
  { id: "trips", label: "Saved trips", Icon: RouteIcon },
  { id: "prefs", label: "Your preferences", Icon: UserIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

type Props = {
  page: Page;
  onNavigate: (page: Page) => void;
  savedCount: number;
  tripCount: number;
};

export function MenuButton({ page, onNavigate, savedCount, tripCount }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={page === "map" || page === "place" ? "menu" : "menu menu--topbar"}>
      <button
        type="button"
        className={open ? "menu-button is-open" : "menu-button"}
        aria-label={open ? "Close menu" : "Menu"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="menu-burger" aria-hidden="true" />
      </button>

      {open && (
        <div className="menu-popover" role="menu">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={page === item.id ? "menu-item is-current" : "menu-item"}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => {
                onNavigate(item.id);
                setOpen(false);
              }}
            >
              <item.Icon size={18} />
              <span>{item.label}</span>
              {item.id === "saved" && savedCount > 0 && <span className="menu-count">{savedCount}</span>}
              {item.id === "trips" && tripCount > 0 && <span className="menu-count">{tripCount}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
