import { useState } from "react";
import type { Place } from "../types";
import "./PlaceThumb.css";

export function PlaceThumb({ place, className }: { place: Pick<Place, "id" | "name" | "category">; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`thumb thumb--${place.category} ${className ?? ""}`}>
      {broken ? (
        <span className="thumb-initial" aria-hidden="true">
          {place.name.charAt(0)}
        </span>
      ) : (
        <img src={`/places/${place.id}.jpg`} alt="" loading="lazy" onError={() => setBroken(true)} />
      )}
    </span>
  );
}
