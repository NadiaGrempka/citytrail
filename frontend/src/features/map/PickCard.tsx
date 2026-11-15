import { humanize, placeMeta } from "../../placeInfo";
import type { Place } from "../../types";
import "./PickCard.css";

type Props = {
  place: Place;
  onDetails: () => void;
  onShowRoute: () => void;
  onRollAgain: () => void;
  onClose: () => void;
};

export function PickCard({ place, onDetails, onShowRoute, onRollAgain, onClose }: Props) {
  return (
    <section className="pick-card" aria-label="Random pick">
      <button type="button" className="pick-card-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <p className="pick-card-kind">{humanize(place.subcategory)}</p>
      <h2>{place.name}</h2>
      <p className="pick-card-meta">{placeMeta(place)}</p>
      <div className="pick-card-actions">
        <button type="button" onClick={onDetails}>
          Details
        </button>
        <button type="button" onClick={onShowRoute}>
          Show me the way
        </button>
        <button type="button" onClick={onRollAgain}>
          Roll again
        </button>
      </div>
    </section>
  );
}
