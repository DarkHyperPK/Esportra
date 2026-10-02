import { useCallback, useSyncExternalStore } from "react";
import { readReduceMotion, setReduceMotion, subscribeReduceMotion } from "@/lib/motionPreference";

const serverSnapshot = () => false;

/**
 * Whether the person turned on Reduce motion in their Esportra settings.
 * Replaces framer-motion's `useReducedMotion`, which follows the OS setting;
 * on Esportra it's opt-in and off by default.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduceMotion, readReduceMotion, serverSnapshot);
}

/** The setting plus a setter, for the settings screen. */
export function useReduceMotionSetting() {
  const reduceMotion = useReducedMotion();
  const update = useCallback((on: boolean) => setReduceMotion(on), []);
  return [reduceMotion, update] as const;
}
