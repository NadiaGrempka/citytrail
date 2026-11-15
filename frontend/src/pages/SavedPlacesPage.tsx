import { PlaceThumb } from "../components/PlaceThumb";
import { ArrowRightIcon, HeartIcon } from "../components/icons";
import { humanize, transitLine } from "../placeInfo";
import type { Place } from "../types";

type Props = { places: Place[]; onOpenPlace: (id: string) => void; onExplore: () => void };

/** The hearted places, in the order they were saved. */
export function SavedPlacesPage({ places, onOpenPlace, onExplore }: Props) {
  return (
    <div className="page-content">
      <p className="eyebrow">Your shortlist</p>
      <h1 className="page-title">Saved for later</h1>
      <p className="page-lede">
        Keep a few good ideas close. You can always ask the guide to turn them into a route.
      </p>

      {places.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <HeartIcon size={26} />
          </span>
          <h2>Nothing saved yet</h2>
          <p>Tap the heart on any place you’d like to remember.</p>
          <button type="button" className="btn-primary" onClick={onExplore}>
            Explore places
          </button>
        </div>
      ) : (
        <ul className="saved-rows">
          {places.map((place) => (
            <li key={place.id}>
              <button type="button" className="saved-row" onClick={() => onOpenPlace(place.id)}>
                <PlaceThumb place={place} className="saved-row-thumb" />
                <span className="saved-row-text">
                  <span className="eyebrow">{humanize(place.subcategory)}</span>
                  <span className="saved-row-name">{place.name}</span>
                  <span className="saved-row-meta">{transitLine(place)}</span>
                </span>
                <ArrowRightIcon size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
