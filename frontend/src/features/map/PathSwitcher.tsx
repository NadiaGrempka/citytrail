import { MODE_LABEL } from "../../api/transit";
import type { TransitAlternative } from "../../api/transit";
import "./PathSwitcher.css";

export type PathGroup = {
  legIndex: number;
  title: string;
  alternatives: TransitAlternative[];
  selected: number;
};

type Props = {
  groups: PathGroup[];
  onSelect: (legIndex: number, alternativeIndex: number) => void;
};

function summary(a: TransitAlternative): string {
  const changes = a.transfers === 0 ? "direct" : a.transfers === 1 ? "1 change" : `${a.transfers} changes`;
  return `${a.depart} → ${a.arrive} · ${changes}`;
}

export function PathSwitcher({ groups, onSelect }: Props) {
  if (groups.length === 0) return null;
  return (
    <section className="path-switcher" aria-label="Choose a route for the ride">
      {groups.map((g) => (
        <div key={g.legIndex} className="path-group" role="radiogroup" aria-label={g.title}>
          <h2 className="path-title">{g.title}</h2>
          {g.alternatives.map((a, i) => (
            <button
              key={a.label + a.depart}
              type="button"
              role="radio"
              aria-checked={i === g.selected}
              className={i === g.selected ? "path-option path-option--on" : "path-option"}
              onClick={() => onSelect(g.legIndex, i)}
            >
              <span className="path-main">
                <strong>{a.label || MODE_LABEL.bus}</strong>
                <span>{a.minutes} min</span>
              </span>
              <span className="path-sub">{summary(a)}</span>
            </button>
          ))}
        </div>
      ))}
    </section>
  );
}
