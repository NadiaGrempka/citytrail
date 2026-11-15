import type { ReactNode } from "react";
import type { Theme } from "../theme";
import { MapIcon, SparkIcon } from "./icons";
import { ThemeButton } from "./ThemeButton";
import "./PageShell.css";

type Props = {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onOpenMap: () => void;
  children: ReactNode;
};

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
