import type { ReactNode } from "react";
import type { Theme } from "../theme";
import { MapIcon, MoonIcon, SparkIcon, SunIcon } from "./icons";

type Props = {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onOpenMap: () => void;
  children: ReactNode;
};

/** Full-screen page with the shared top bar; the menu button floats above it, top-left. */
export function PageShell({ theme, onThemeChange, onOpenMap, children }: Props) {
  return (
    <div className="page">
      <header className="topbar">
        <span className="topbar-menu-space" aria-hidden="true" />
        <button type="button" className="topbar-brand" onClick={onOpenMap}>
          <SparkIcon size={18} /> CityTrail
        </button>
        <div className="topbar-right">
          <ThemeButton theme={theme} onChange={onThemeChange} />
          <button type="button" className="topbar-map" onClick={onOpenMap}>
            <span className="topbar-map-text">Open map</span>
            <MapIcon size={18} />
          </button>
        </div>
      </header>
      <main className="page-main">{children}</main>
    </div>
  );
}

/** Light theme shows a moon (switch to dark), dark theme shows a sun. Pass `labelled` for the pill version. */
export function ThemeButton({
  theme,
  onChange,
  labelled = false,
}: {
  theme: Theme;
  onChange: (t: Theme) => void;
  labelled?: boolean;
}) {
  const next: Theme = theme === "light" ? "dark" : "light";
  const label = next === "dark" ? "Switch to dark theme" : "Switch to light theme";
  const Icon = theme === "light" ? MoonIcon : SunIcon;
  return (
    <button
      type="button"
      className={labelled ? "theme-button theme-button--labelled" : "theme-button"}
      aria-label={label}
      title={label}
      onClick={() => onChange(next)}
    >
      <Icon size={18} />
      {labelled && (next === "dark" ? "Use dark theme" : "Use light theme")}
    </button>
  );
}
