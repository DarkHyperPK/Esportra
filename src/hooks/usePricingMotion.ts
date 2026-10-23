import { useReducedMotion as useSystemReducedMotion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function usePricingMotion() {
  const appReducedMotion = useReducedMotion();
  const systemReducedMotion = useSystemReducedMotion();
  return !appReducedMotion && !systemReducedMotion;
}
