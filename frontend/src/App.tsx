import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { fetchPlaces, getTrip, listTrips } from "./api/client";
import { ChatBox, type GuideRequest, type OpenedTrip } from "./features/chat/ChatBox";
import { PageShell } from "./components/PageShell";
import type { RouteOverlay } from "./api/transit";
import { useFavorites } from "./favorites";
import { useInterests } from "./interests";
import { Toast } from "./components/Toast";
import { MenuButton, type Page } from "./features/menu/MenuButton";
import { MapView } from "./features/map/MapView";
import { MapActions } from "./features/map/MapActions";
import { PickCard } from "./features/map/PickCard";
import { useTrail } from "./features/map/useTrail";
import { resolveStart, type StartPoint } from "./location";
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

  useEffect(() => {
    listTrips()
      .then((list) => setTripCount(list.length))
      .catch(() => undefined);
  }, [page, toast]);

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, String(panelWidth));
    } catch {
    }
  }, [panelWidth]);

  const updateStart = useCallback((next: StartPoint) => {
    setStart((cur) =>
      cur && cur.lat === next.lat && cur.lng === next.lng && cur.label === next.label && cur.source === next.source
        ? cur
        : next,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const manual =
      settings.manualLat !== null && settings.manualLng !== null
        ? { lat: settings.manualLat, lng: settings.manualLng, label: settings.manualAddress.trim() }
        : null;
    resolveStart(settings.startMode, manual)
      .then((s) => !cancelled && updateStart(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [settings.startMode, settings.manualLat, settings.manualLng, updateStart]);

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

  function askGuide(text: string, send: boolean) {
    setRequest({ key: Date.now(), text, send });
    setPage("map");
  }

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
        onStartResolved={updateStart}
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
        <MapActions theme={theme} onThemeChange={setTheme} onFindFun={rollPlace} disabled={places.length === 0} />
      )}
      {page === "map" && pick && (
        <PickCard
          place={pick.place}
          onDetails={() => openPlace(pick.place.id)}
          onShowRoute={() => askGuide(pick.place.name, true)}
          onRollAgain={rollPlace}
          onClose={() => setPick(null)}
        />
      )}
      {page === "place" && (
        <PlaceDetailPage
          place={place}
          saved={place ? favorites.has(place.id) : false}
          onToggleSaved={() => place && favorites.toggle(place.id)}
          onBack={() => setPage(cameFrom)}
          onShowRoute={(p) => askGuide(p.name, true)}
          onAskGuide={(p) => askGuide(`a cafe near ${p.name}`, false)}
        />
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
    </main>
  );
}

export default App;
