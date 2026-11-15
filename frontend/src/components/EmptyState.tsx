import type { ReactNode } from "react";
import "./EmptyState.css";

type Props = {
  icon: ReactNode;
  title: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
};

export function EmptyState({ icon, title, text, actionLabel, onAction }: Props) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button type="button" className="btn-primary" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
