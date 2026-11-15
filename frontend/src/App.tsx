import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { fetchPlaces, getTrip, listTrips } from "./api/client";
import { ChatBox, type GuideRequest, type OpenedTrip } from "./features/chat/ChatBox";
import { PageShell, ThemeButton } from "./components/PageShell";
import { CompassIcon } from "./components/icons";
import { humanize, placeMeta } from "./placeInfo";
import type { RouteOverlay } from "./api/transit";
import { useFavorites } from "./favorites";
import { useInterests } from "./interests";
import { Toast } from "./components/Toast";
import { MenuButton, type Page } from "./features/menu/MenuButton";
import { MapView } from "./features/map/MapView";
import { useTrail } from "./features/map/useTrail";
import type { StartPoint } from "./location";
import { DiscoverPage } from "./pages/DiscoverPage";
import { PlaceDetailPage } from "./pages/PlaceDetailPage";
import { PreferencesPage } from "./pages/PreferencesPage";
import { SavedPlacesPage } from "./pages/SavedPlacesPage";
import { SavedTripsPage } from "./pages/SavedTripsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useSettings } from "./settings";
import { useTheme } from "./theme";
import type { Place, Plan, Stop } from "./types";
import "./App.css";
import "./pages.css";

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
  const [settings, updateSettings] = useSettings();
  const [start, setStart] = useState<StartPoint | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const trail = useTrail(plan, start);
  const [docked, setDocked] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(loadWidth);
  const [openedTrip, setOpenedTrip] = useState<OpenedTrip | null>(null);
  const [page, setPage] = useState<Page>("map");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [cameFrom, setCameFrom] = useState<Page>("discover");
  const [routeOverlay, setRouteOverlay] = useState<RouteOverlay | null>(null);
  const [pick, setPick] = useState<{ key: number; place: Place } | null>(null);
  const [request, setRequest] = useState<GuideRequest | null>(null);
  const favorites = useFavorites();
  const interests = useInterests();
  const [tripCount, setTripCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    fetchPlaces()
      .then(setPlaces)
      .catch((e: unknown) => console.warn("Could not load places:", e));
  }, []);

  // Saved-trip count for the menu badge: refreshed on load, after saving a trip, and when changing screens.
  useEffect(() => {
    listTrips()
      .then((list) => setTripCount(list.length))
      .catch(() => undefined);
  }, [page, toast]);

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, String(panelWidth));
    } catch {
      /* storage unavailable: width just won't persist */
    }
  }, [panelWidth]);

  function openTrip(id: string) {
    getTrip(id)
      .then((view) => {
        setOpenedTrip({ key: Date.now(), view });
        setPage("map");
      })
      .catch((e: unknown) => console.warn("Could not open the trip:", e));
  }

  function openPlace(id: string) {
    setCameFrom(page === "place" ? cameFrom : page);
    setPlaceId(id);
    setPage("place");
  }

  /** Hand a message to the guide and go back to the map. */
  function askGuide(text: string, send: boolean) {
    setRequest({ key: Date.now(), text, send });
    setPage("map");
  }

  /** "Find something fun": any place at all, picked at random. */
  function rollPlace() {
    if (places.length === 0) return;
    setPick({ key: Date.now(), place: places[Math.floor(Math.random() * places.length)] });
  }

  const place = places.find((p) => p.id === placeId);
  const savedPlaces = favorites.ids.flatMap((id) => places.filter((p) => p.id === id));

  const workspaceStyle = { "--panel-w": docked ? `${panelWidth}px` : "0px" } as CSSProperties;

  return (
    <main className={docked ? "app app--docked" : "app"} style={workspaceStyle}>
      <div className={resizing ? "workspace workspace--resizing" : "workspace"}>
        <MapView theme={theme} start={start} stops={plan?.stops ?? NO_STOPS} trail={trail} focus={pick} route={routeOverlay} />
      </div>
      <ChatBox
        docked={docked}
        width={panelWidth}
        minWidth={MIN_PANEL_WIDTH}
        onWidthChange={setPanelWidth}
        onResizingChange={setResizing}
        onFirstSend={() => setDocked(true)}
        onStartResolved={setStart}
        onPlan={(p) => {
          setPlan(p);
          setRouteOverlay(null);
        }}
        onRouteOption={setRouteOverlay}
        openedTrip={openedTrip}
        settings={settings}
        request={request}
        onEditSettings={() => setPage("settings")}
        onTripSaved={() => setToast("Trip saved")}
      />
      {page === "map" && (
        <div className="map-actions">
          <ThemeButton theme={theme} onChange={setTheme} />
          <button type="button" className="find-fun" onClick={rollPlace} disabled={places.length === 0}>
            <CompassIcon size={18} /> Find something fun
          </button>
        </div>
      )}
      {page === "map" && pick && (
        <section className="pick-card" aria-label="Random pick">
          <button type="button" className="pick-card-close" aria-label="Close" onClick={() => setPick(null)}>
            ×
          </button>
          <p className="pick-card-kind">{humanize(pick.place.subcategory)}</p>
          <h2>{pick.place.name}</h2>
          <p className="pick-card-meta">{placeMeta(pick.place)}</p>
          <div className="pick-card-actions">
            <button type="button" onClick={() => openPlace(pick.place.id)}>
              Details
            </button>
            <button type="button" onClick={() => askGuide(pick.place.name, true)}>
              Show me the way
            </button>
            <button type="button" onClick={rollPlace}>
              Roll again
            </button>
          </div>
        </section>
      )}
      {page === "place" && (
        <div className="page page--detail">
          <PlaceDetailPage
            place={place}
            saved={place ? favorites.has(place.id) : false}
            onToggleSaved={() => place && favorites.toggle(place.id)}
            onBack={() => setPage(cameFrom)}
            onShowRoute={(p) => askGuide(p.name, true)}
            onAskGuide={(p) => askGuide(`a cafe near ${p.name}`, false)}
          />
        </div>
      )}
      {page !== "map" && page !== "place" && (
        <PageShell theme={theme} onThemeChange={setTheme} onOpenMap={() => setPage("map")}>
          {page === "discover" && (
            <DiscoverPage
              places={places}
              interests={interests.selected}
              isSaved={favorites.has}
              onToggleSaved={favorites.toggle}
              onOpenPlace={openPlace}
            />
          )}
          {page === "saved" && (
            <SavedPlacesPage places={savedPlaces} onOpenPlace={openPlace} onExplore={() => setPage("discover")} />
          )}
          {page === "prefs" && (
            <PreferencesPage
              selected={interests.selected}
              onToggle={interests.toggle}
              settings={settings}
              onEditSettings={() => setPage("settings")}
            />
          )}
          {page === "trips" && (
            <SavedTripsPage places={places} onOpen={openTrip} onOpenMap={() => setPage("map")} onCountChange={setTripCount} />
          )}
          {page === "settings" && (
            <SettingsPage
              settings={settings}
              onChange={updateSettings}
              theme={theme}
              onThemeChange={setTheme}
              onResetPanelWidth={() => setPanelWidth(DEFAULT_PANEL_WIDTH)}
              onTripsCleared={() => setTripCount(0)}
            />
          )}
        </PageShell>
      )}
      <MenuButton page={page} onNavigate={setPage} savedCount={favorites.ids.length} tripCount={tripCount} />
      <Toast message={toast} onDone={clearToast} />
      {/*<p className="status" role="status">*/}
      {/*  {error ? `Backend unreachable: ${error}` : `${places.length} places loaded from the backend`}*/}
      {/*</p>*/}
    </main>
  );
}

export default App;
