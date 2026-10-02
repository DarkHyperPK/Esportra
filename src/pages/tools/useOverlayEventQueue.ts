import { useEffect, useRef, useState } from "react";
import {
  diffOverlayEvents,
  settledEventIds,
  type OverlayEventSlot,
  type OverlayVetoEvent,
} from "./overlayVetoEvents";

/** How long each moment holds on screen before the next one plays. */
export const OVERLAY_EVENT_HOLD_MS = 2600;
/** Exit is faster than entry. */
export const OVERLAY_EVENT_EXIT_MS = 340;

export type OverlayEventPhase = "in" | "out";

/**
 * Turns veto state changes into a queue of on-air moments. What's already on
 * screen when the overlay loads (or OBS refreshes the source) never replays;
 * each new ban, pick, decider or side choice plays once, in veto order.
 */
export function useOverlayEventQueue(slots: OverlayEventSlot[], ready: boolean) {
  const seenRef = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<OverlayVetoEvent[]>([]);
  const [current, setCurrent] = useState<OverlayVetoEvent | null>(null);
  const [phase, setPhase] = useState<OverlayEventPhase>("in");

  useEffect(() => {
    if (!ready) return;
    if (!seenRef.current) {
      seenRef.current = settledEventIds(slots);
      return;
    }
    const fresh = diffOverlayEvents(seenRef.current, slots);
    if (fresh.length === 0) {
      // A reset clears the board: forget what was seen so the new veto animates.
      if (slots.every((slot) => slot.kind === "pending")) seenRef.current = new Set();
      return;
    }
    fresh.forEach((event) => seenRef.current?.add(event.id));
    setQueue((existing) => [...existing, ...fresh]);
  }, [ready, slots]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setPhase("in");
    setCurrent(next);
  }, [current, queue]);

  useEffect(() => {
    if (!current) return undefined;
    const exitTimer = window.setTimeout(() => setPhase("out"), OVERLAY_EVENT_HOLD_MS);
    const doneTimer = window.setTimeout(() => setCurrent(null), OVERLAY_EVENT_HOLD_MS + OVERLAY_EVENT_EXIT_MS);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [current]);

  /** Slots whose moment is still waiting its turn render as not-yet-settled. */
  const awaitingSettle = new Set(queue.filter((event) => event.kind !== "side").map((event) => event.slotKey));
  const awaitingSide = new Set(queue.filter((event) => event.kind === "side").map((event) => event.slotKey));
  if (current?.kind === "side") awaitingSide.delete(current.slotKey);

  return { current, phase, awaitingSettle, awaitingSide };
}
