import { useEffect, useState, type SubmitEvent } from "react";
import { deleteTrip, listTrips, renameTrip } from "../api/client";
import { PlaceThumb } from "../components/PlaceThumb";
import { RouteIcon, TrashIcon } from "../components/icons";
import type { Place, Trip } from "../types";

type Props = {
  places: Place[];
  onOpen: (id: string) => void;
  onOpenMap: () => void;
  /** Reports how many trips there are, so the menu badge stays right after deleting. */
  onCountChange: (count: number) => void;
};

export function SavedTripsPage({ places, onOpen, onOpenMap, onCountChange }: Props) {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (trips) onCountChange(trips.length);
  }, [trips, onCountChange]);

  useEffect(() => {
    let cancelled = false;
    listTrips()
      .then((list) => !cancelled && setTrips(list))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = new Map(places.map((p) => [p.id, p]));

  async function remove(id: string) {
    try {
      await deleteTrip(id);
      setTrips((list) => list?.filter((t) => t.id !== id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveName(e: SubmitEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    try {
      const updated = await renameTrip(id, draft);
      setTrips((list) => list?.map((t) => (t.id === id ? updated : t)) ?? null);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page-content">
      <p className="eyebrow">Plans worth keeping</p>
      <h1 className="page-title">Saved trips</h1>
      <p className="page-lede">Routes and ideas saved from your guide conversations, ready when you are.</p>

      {error && <p className="page-error">{error}</p>}
      {!error && trips === null && <p className="page-lede">Loading your trips…</p>}

      {trips && trips.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">
            <RouteIcon size={26} />
          </span>
          <h2>No saved trips yet</h2>
          <p>Ask the guide for ideas, then tap “Save trip” in the chat.</p>
          <button type="button" className="btn-primary" onClick={onOpenMap}>
            Open the guide
          </button>
        </div>
      )}

      <ul className="trip-cards">
        {trips?.map((t) => {
          const stops = t.stopIds.map((id) => byId.get(id)).filter((p): p is Place => Boolean(p));
          return (
            <li key={t.id} className="trip-card">
              <div className="trip-card-photos">
                {stops.slice(0, 2).map((p) => (
                  <PlaceThumb key={p.id} place={p} />
                ))}
              </div>
              <div className="trip-card-body">
                <p className="eyebrow">
                  {t.stopIds.length} stop{t.stopIds.length === 1 ? "" : "s"}
                </p>
                {editing === t.id ? (
                  <form className="trip-card-rename" onSubmit={(e) => saveName(e, t.id)}>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={80}
                      aria-label="Trip name"
                      autoFocus
                    />
                    <button type="submit" className="btn-small">
                      Save
                    </button>
                    <button type="button" className="btn-small" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <h2 className="trip-card-title">{t.title}</h2>
                )}
                <p className="trip-card-stops">{stops.map((p) => p.name).join(" → ")}</p>
                <p className="trip-card-meta">
                  {t.returnHome ? "Ride home included" : "One way"} · saved {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="trip-card-actions">
                <button type="button" className="btn-primary" onClick={() => onOpen(t.id)}>
                  <RouteIcon size={16} /> Open
                </button>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => {
                    setEditing(t.id);
                    setDraft(t.title);
                  }}
                >
                  Rename
                </button>
                <button type="button" className="icon-button" aria-label={`Delete ${t.title}`} onClick={() => remove(t.id)}>
                  <TrashIcon size={17} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
