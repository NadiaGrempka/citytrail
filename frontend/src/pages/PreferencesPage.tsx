import { UserIcon } from "../components/icons";
import { INTERESTS } from "../interests";
import { startLabel, type Settings } from "../settings";
import "./PreferencesPage.css";

type Props = {
  selected: string[];
  onToggle: (id: string) => void;
  settings: Settings;
  onEditSettings: () => void;
};

const PACE_LABEL = { slow: "Slow (about 3.6 km/h)", normal: "Normal (about 4.8 km/h)", fast: "Fast (about 6 km/h)" };

export function PreferencesPage({ selected, onToggle, settings, onEditSettings }: Props) {
  return (
    <div className="page-content">
      <div className="prefs-head">
        <span className="prefs-avatar" aria-hidden="true">
          <UserIcon size={34} />
        </span>
        <div>
          <p className="eyebrow">New in town</p>
          <h1 className="page-title">Make the city yours.</h1>
        </div>
      </div>

      <section className="vibe-card">
        <div>
          <p className="eyebrow vibe-eyebrow">Your vibe</p>
          <h2>What sounds good?</h2>
          <p>Choose a few and Discover will put matching places first.</p>
        </div>
        <div className="vibe-tags" role="group" aria-label="Your interests">
          {INTERESTS.map((i) => (
            <button
              key={i.id}
              type="button"
              className={selected.includes(i.id) ? "vibe-tag is-active" : "vibe-tag"}
              aria-pressed={selected.includes(i.id)}
              onClick={() => onToggle(i.id)}
            >
              {i.label}
            </button>
          ))}
        </div>
      </section>

      <ul className="setting-rows">
        <li>
          <div>
            <span className="setting-name">Start area</span>
            <span className="setting-value">{startLabel(settings)}</span>
          </div>
          <button type="button" className="link-button" onClick={onEditSettings}>
            Change
          </button>
        </li>
        <li>
          <div>
            <span className="setting-name">Walking pace</span>
            <span className="setting-value">{PACE_LABEL[settings.walkPace]}</span>
          </div>
          <button type="button" className="link-button" onClick={onEditSettings}>
            Change
          </button>
        </li>
        <li>
          <div>
            <span className="setting-name">Guide language</span>
            <span className="setting-value">English</span>
          </div>
        </li>
      </ul>
    </div>
  );
}
