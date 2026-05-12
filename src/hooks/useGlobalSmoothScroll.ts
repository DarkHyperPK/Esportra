import { useCallback, useEffect } from 'react';
import Lenis from 'lenis';

type ScrollTarget = Parameters<Lenis['scrollTo']>[0];
type ScrollOptions = Parameters<Lenis['scrollTo']>[1];

let lenis: Lenis | null = null;
let frameId = 0;
let subscribers = 0;

const easing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const startLenis = () => {
  if (typeof window === 'undefined' || prefersReducedMotion()) return null;

  if (!lenis) {
    lenis = new Lenis({
      duration: 1.05,
      easing,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.15,
    });

    const raf = (time: number) => {
      lenis?.raf(time);
      frameId = requestAnimationFrame(raf);
    };

    frameId = requestAnimationFrame(raf);
  }

  return lenis;
};

const stopLenis = () => {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  lenis?.destroy();
  lenis = null;
};

export const scrollToSmooth = (target: ScrollTarget, options?: ScrollOptions) => {
  if (lenis) {
    lenis.scrollTo(target, options);
    return;
  }

  if (typeof window === 'undefined') return;

  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: options?.immediate ? 'instant' : 'smooth' });
    return;
  }

  const element = typeof target === 'string' ? document.querySelector(target) : target;

  if (element instanceof HTMLElement) {
    const top = element.getBoundingClientRect().top + window.scrollY + (options?.offset ?? 0);
    window.scrollTo({ top, behavior: options?.immediate ? 'instant' : 'smooth' });
  }
};

export function useGlobalSmoothScroll() {
  useEffect(() => {
    subscribers += 1;
    startLenis();

    return () => {
      subscribers = Math.max(0, subscribers - 1);
      if (subscribers === 0) stopLenis();
    };
  }, []);

  const scrollTo = useCallback((target: ScrollTarget, options?: ScrollOptions) => {
    scrollToSmooth(target, options);
  }, []);

  return { scrollTo };
}
