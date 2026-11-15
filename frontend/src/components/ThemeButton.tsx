import type { Theme } from "../theme";
import { MoonIcon, SunIcon } from "./icons";
import "./ThemeButton.css";

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
