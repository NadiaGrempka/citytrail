import { useEffect } from "react";
import { CheckIcon } from "./icons";

type Props = { message: string | null; onDone: () => void };

/** Bottom-centre confirmation pill; dismisses itself after 2.4 s. */
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
