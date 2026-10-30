import { useEffect, useState } from 'react';

export function useSyncCooldown() {
  const [availableAt, setAvailableAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!availableAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) setAvailableAt(0);
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [availableAt]);
  return { seconds, setAvailableAt };
}
