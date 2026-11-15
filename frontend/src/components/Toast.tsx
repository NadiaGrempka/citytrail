import { useEffect } from "react";
import { CheckIcon } from "./icons";
import "./Toast.css";

type Props = { message: string | null; onDone: () => void };

export function Toast({ message, onDone }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className="toast" role="status">
      <CheckIcon size={16} />
      {message}
    </div>
  );
}
