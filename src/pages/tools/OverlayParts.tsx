import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TYPE_MS_PER_CHAR = 45;

/** Types its text out character by character whenever the text changes. */
export const TypewriterLine = ({ text, className, cursorClassName }: { text: string; className: string; cursorClassName: string }) => {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (!text) {
      setShown("");
      return undefined;
    }
    let count = 0;
    setShown("");
    const timer = window.setInterval(() => {
      count += 1;
      setShown(text.slice(0, count));
      if (count >= text.length) window.clearInterval(timer);
    }, TYPE_MS_PER_CHAR);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <p className={cn("flex items-center", className)} aria-live="polite">
      <span>{shown}</span>
      {text ? <span aria-hidden className={cn("bcv-cursor inline-block", cursorClassName)} /> : null}
    </p>
  );
};

/** Wall clock with a status word, ticking every second. */
export const LiveClock = ({ label, className }: { label: string; className: string }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <span className={className}>
      {time} {label}
    </span>
  );
};
