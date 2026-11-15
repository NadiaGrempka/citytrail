import { CompassIcon } from "../../components/icons";
import { ThemeButton } from "../../components/ThemeButton";
import type { Theme } from "../../theme";
import "./MapActions.css";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onFindFun: () => void;
  disabled: boolean;
};

export function MapActions({ theme, onThemeChange, onFindFun, disabled }: Props) {
  return (
    <div className="map-actions">
      <ThemeButton theme={theme} onChange={onThemeChange} />
      <button type="button" className="find-fun" onClick={onFindFun} disabled={disabled}>
        <CompassIcon size={18} /> Find something fun
      </button>
    </div>
  );
}
