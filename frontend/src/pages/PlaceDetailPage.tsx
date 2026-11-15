import { HeartButton } from "../components/HeartButton";
import { PlaceThumb } from "../components/PlaceThumb";
import { ArrowLeftIcon, SparkIcon, WalkIcon } from "../components/icons";
import { humanize, transitLine } from "../placeInfo";
import type { Place } from "../types";

type Props = {
  place: Place | undefined;
  saved: boolean;
  onToggleSaved: () => void;
  onBack: () => void;
  onShowRoute: (place: Place) => void;
  onAskGuide: (place: Place) => void;
};

export function PlaceDetailPage({ place, saved, onToggleSaved, onBack, onShowRoute, onAskGuide }: Props) {
  if (!place) {
    return (
      <div className="detail-missing">
        <p>That place isn’t available.</p>
        <button type="button" className="btn-primary" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="detail">
      <div className="detail-photo">
        <PlaceThumb place={place} className="detail-photo-fill" />
        <button type="button" className="round-button detail-back" onClick={onBack} aria-label="Back">
          <ArrowLeftIcon size={20} />
        </button>
        <HeartButton className="detail-heart" name={place.name} saved={saved} onToggle={onToggleSaved} />
      </div>

      <div className="detail-body">
        <p className="eyebrow">{humanize(place.subcategory)}</p>
        <h1 className="page-title detail-title">{place.name}</h1>
        <p className="detail-meta">
          {place.hoursNote && <span>{place.hoursNote}</span>}
          <span>{transitLine(place)}</span>
        </p>
        <p className="detail-description">{place.description}</p>

        <ul className="tag-list">
          {place.tags.slice(0, 6).map((t) => (
            <li key={t}>{humanize(t)}</li>
          ))}
        </ul>

        {place.upcomingEvents && place.upcomingEvents.length > 0 && (
          <div className="guide-note">
            <span className="guide-note-icon">
              <SparkIcon size={18} />
            </span>
            <div>
              <h2>Coming up</h2>
              {place.upcomingEvents.map((e) => (
                <p key={`${e.title}-${e.dayOffset}`}>
                  {e.title} · {e.time}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="guide-note">
          <span className="guide-note-icon">
            <SparkIcon size={18} />
          </span>
          <div>
            <h2>Getting there</h2>
            <p>
              The nearest {place.transit.mode} stop is {place.transit.stop}, about {place.transit.walkMin} minutes on
              foot{place.address ? `. Address: ${place.address}` : ""}.
            </p>
          </div>
        </div>

        <div className="detail-actions">
          <button type="button" className="btn-primary" onClick={() => onShowRoute(place)}>
            <WalkIcon size={18} /> Show me the way
          </button>
          <button type="button" className="btn-small btn-large" onClick={() => onAskGuide(place)}>
            Ask the guide
          </button>
        </div>
      </div>
    </div>
  );
}
