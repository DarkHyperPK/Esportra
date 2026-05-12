import { useCallback } from 'react';
import { scrollToSmooth } from '@/hooks/useGlobalSmoothScroll';

export function useSeasonSmoothScroll() {
  const scrollTo = useCallback((target: HTMLElement | null, offset = -88) => {
    if (!target) return;
    scrollToSmooth(target, { offset });
  }, []);

  return { scrollTo };
}
