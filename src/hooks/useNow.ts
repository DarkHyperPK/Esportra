import { useEffect, useState } from 'react';

/**
 * Current time in ms, refreshed every `intervalMs`.
 * Keep the ticker in the smallest component that shows it so a countdown
 * does not re-render a whole page every second.
 */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);

  return now;
}
