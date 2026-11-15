import { useMemo, useState } from "react";
import { HeartButton } from "../components/HeartButton";
import { PlaceThumb } from "../components/PlaceThumb";
import { interestScore } from "../interests";
import { humanize, placeMeta } from "../placeInfo";
import type { Place } from "../types";
import "./DiscoverPage.css";

type Filter = "everything" | "tonight" | "coffee" | "culture" | "outside";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "everything", label: "Everything" },
  { id: "tonight", label: "Tonight" },
  { id: "coffee", label: "Coffee" },
  { id: "culture", label: "Culture" },
  { id: "outside", label: "Outside" },
];

const has = (p: Place, tags: string[]) => p.tags.some((t) => tags.includes(t));

const MATCHES: Record<Filter, (p: Place) => boolean> = {
  everything: () => true,
  tonight: (p) =>
    (p.upcomingEvents?.length ?? 0) > 0 || has(p, ["evening", "nightlife", "date-night", "concert", "student-club"]),
  coffee: (p) => has(p, ["coffee", "specialty-coffee", "roastery"]) || p.subcategory.startsWith("cafe"),
  culture: (p) => p.category === "event" || has(p, ["gallery", "museum", "history", "literary", "art-books", "folk-art"]),
  outside: (p) => has(p, ["park", "outdoor", "green", "walk", "view", "waterfront", "riverside", "sea-air", "historic-street"]),
};

const PAGE_SIZE = 9;

type Props = {
  places: Place[];
  interests: string[];
  isSaved: (id: string) => boolean;
  onToggleSaved: (id: string) => void;
  onOpenPlace: (id: string) => void;
};

export function DiscoverPage({ places, interests, isSaved, onToggleSaved, onOpenPlace }: Props) {
  const [filter, setFilter] = useState<Filter>("everything");
  const [shown, setShown] = useState(PAGE_SIZE);

  const visible = useMemo(() => {
    const matching = places.filter(MATCHES[filter]);
    return matching
      .map((place, index) => ({ place, index, score: interestScore(place, interests) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((x) => x.place);
  }, [places, filter, interests]);

  return (
    <div className="page-content page-content--wide">
      <p className="eyebrow">Picked for a good day out</p>
      <h1 className="page-title">What are you in the mood for?</h1>
      <p className="page-lede">Friendly places with a little character, all easy to reach from where you are.</p>

      <div className="filters" role="group" aria-label="Filter places">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? "filter is-active" : "filter"}
            aria-pressed={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              setShown(PAGE_SIZE);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {places.length === 0 && <p className="page-lede">Loading places…</p>}
      {places.length > 0 && visible.length === 0 && <p className="page-lede">Nothing fits that one yet. Try another.</p>}

      <ul className="place-grid">
        {visible.slice(0, shown).map((place) => (
          <li key={place.id} className="place-card">
            <PlaceThumb place={place} className="place-card-photo" />
            <span className="place-card-shade" aria-hidden="true" />
            <button type="button" className="place-card-open" onClick={() => onOpenPlace(place.id)}>
              <span className="place-card-kind">{humanize(place.subcategory)}</span>
              <span className="place-card-name">{place.name}</span>
              <span className="place-card-meta">{placeMeta(place)}</span>
            </button>
            <HeartButton
              className="place-card-heart"
              name={place.name}
              saved={isSaved(place.id)}
              onToggle={() => onToggleSaved(place.id)}
            />
          </li>
        ))}
      </ul>

      {visible.length > shown && (
        <button type="button" className="btn-small show-more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
          Show more
        </button>
      )}
    </div>
  );
}
