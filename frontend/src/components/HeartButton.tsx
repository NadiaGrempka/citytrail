import { HeartIcon } from "./icons";
import "./HeartButton.css";

type Props = { saved: boolean; onToggle: () => void; name: string; className?: string };

export function HeartButton({ saved, onToggle, name, className }: Props) {
  return (
    <button
      type="button"
      className={`heart-button ${saved ? "is-saved" : ""} ${className ?? ""}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved places` : `Save ${name}`}
      onClick={onToggle}
    >
      <HeartIcon size={18} filled={saved} />
    </button>
  );
}
