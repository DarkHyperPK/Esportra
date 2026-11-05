import { useCallback, useEffect, useRef, useState } from 'react';

/** The server removes a player after 10 minutes without activity; we ask at 8 so they can stay. */
export const IDLE_PROMPT_MS = 8 * 60_000;
/** Ordinary clicks and keys count as activity too; the server hears about it at most this often. */
export const ACTIVITY_PING_MS = 2 * 60_000;
const CHECK_MS = 15_000;

/**
 * Tracks whether the player is still at the screen. Any pointer or key input on the page is activity,
 * reported to the server (throttled) through `onActivity`. After 8 quiet minutes, `prompt` turns true.
 */
export function useSquadUpIdle(enabled: boolean, onActivity: () => void, now: () => number = Date.now) {
  const lastActive = useRef(now());
  const lastPing = useRef(now());
  const [prompt, setPrompt] = useState(false);

  const markActive = useCallback((fromServerAction = false) => {
    lastActive.current = now();
    setPrompt(false);
    if (fromServerAction) { lastPing.current = now(); return; }
    if (now() - lastPing.current >= ACTIVITY_PING_MS) { lastPing.current = now(); onActivity(); }
  }, [now, onActivity]);

  useEffect(() => {
    if (!enabled) return undefined;
    lastActive.current = now();
    const onInput = () => markActive();
    window.addEventListener('pointerdown', onInput);
    window.addEventListener('keydown', onInput);
    const timer = window.setInterval(() => { if (now() - lastActive.current >= IDLE_PROMPT_MS) setPrompt(true); }, CHECK_MS);
    return () => {
      window.removeEventListener('pointerdown', onInput);
      window.removeEventListener('keydown', onInput);
      window.clearInterval(timer);
    };
  }, [enabled, markActive, now]);

  return { prompt, markActive };
}
