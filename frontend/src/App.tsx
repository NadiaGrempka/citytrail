import { useEffect, useState, type CSSProperties } from "react";
import { fetchPlaces } from "./api/client";
import { ChatBox } from "./features/chat/ChatBox";
import { MenuButton } from "./features/menu/MenuButton";
import { MapView } from "./features/map/MapView";
import { useTrail } from "./features/map/useTrail";
import type { StartPoint } from "./location";
import { useTheme } from "./theme";
import type { Place, Plan, Stop } from "./types";
import "./App.css";

const NO_STOPS: Stop[] = [];
const MIN_PANEL_WIDTH = 320;
const DEFAULT_PANEL_WIDTH = 440;
const WIDTH_KEY = "citytrail.panelWidth";

function loadWidth(): number {
  try {
    const n = Number(localStorage.getItem(WIDTH_KEY));
    return n >= MIN_PANEL_WIDTH ? n : DEFAULT_PANEL_WIDTH;
  } catch {
    return DEFAULT_PANEL_WIDTH;
  }
}

function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [theme, setTheme] = useTheme();
  const [start, setStart] = useState<StartPoint | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const trail = useTrail(plan, start);
  const [docked, setDocked] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(loadWidth);

  useEffect(() => {
    fetchPlaces()
      .then(setPlaces)
      .catch((e: unknown) => console.warn("Could not load places:", e));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, String(panelWidth));
    } catch {
      /* storage unavailable: width just won't persist */
    }
  }, [panelWidth]);

  const workspaceStyle = { "--panel-w": docked ? `${panelWidth}px` : "0px" } as CSSProperties;

  return (
    <main className={docked ? "app app--docked" : "app"} style={workspaceStyle}>
      <div className={resizing ? "workspace workspace--resizing" : "workspace"}>
        <MapView places={places} theme={theme} start={start} stops={plan?.stops ?? NO_STOPS} trail={trail} />
      </div>
      <ChatBox
        docked={docked}
        width={panelWidth}
        minWidth={MIN_PANEL_WIDTH}
        onWidthChange={setPanelWidth}
        onResizingChange={setResizing}
        onFirstSend={() => setDocked(true)}
        onStartResolved={setStart}
        onPlan={setPlan}
      />
      <MenuButton theme={theme} onThemeChange={setTheme} />
      {/*<p className="status" role="status">*/}
      {/*  {error ? `Backend unreachable: ${error}` : `${places.length} places loaded from the backend`}*/}
      {/*</p>*/}
    </main>
  );
}

export default App;
