import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';
import { subscribeReduceMotion } from '@/lib/motionPreference';

function appMotionDisabled() {
  return document.documentElement.dataset.reduceMotion === 'true';
}

export function useLfgReducedMotion() {
  const appReduced = useSyncExternalStore(subscribeReduceMotion, appMotionDisabled, () => false);
  const systemReduced = useReducedMotion();
  return appReduced || !!systemReduced;
}
