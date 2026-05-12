import { useCallback, useEffect, useRef } from 'react';
import Lenis from 'lenis';

export function useSeasonSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenisRef.current = lenis;
    let frameId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };

    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = useCallback((target: HTMLElement | null, offset = -88) => {
    if (!target) return;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset });
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return { scrollTo };
}
