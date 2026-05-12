import { useCallback, useEffect } from 'react';
import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;
let subscribers = 0;
let frameId = 0;

function startLenis() {
  if (lenisInstance) return;
  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  const raf = (time: number) => {
    lenisInstance?.raf(time);
    frameId = requestAnimationFrame(raf);
  };
  frameId = requestAnimationFrame(raf);
}

function stopLenis() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  lenisInstance?.destroy();
  lenisInstance = null;
}

export function scrollToSmooth(
  target: number | string | HTMLElement,
  options?: { offset?: number; immediate?: boolean }
) {
  if (!lenisInstance) {
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: options?.immediate ? 'instant' : 'smooth' });
    } else if (typeof target === 'string') {
      const el = document.querySelector(target);
      el?.scrollIntoView({ behavior: options?.immediate ? 'instant' : 'smooth', block: 'start' });
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: options?.immediate ? 'instant' : 'smooth', block: 'start' });
    }
    return;
  }

  if (typeof target === 'number') {
    lenisInstance.scrollTo(target, { immediate: options?.immediate });
  } else if (typeof target === 'string') {
    const el = document.querySelector(target) as HTMLElement | null;
    if (el) lenisInstance.scrollTo(el, { offset: options?.offset, immediate: options?.immediate });
  } else if (target instanceof HTMLElement) {
    lenisInstance.scrollTo(target, { offset: options?.offset, immediate: options?.immediate });
  }
}

export function useGlobalSmoothScroll() {
  useEffect(() => {
    subscribers += 1;
    startLenis();

    return () => {
      subscribers = Math.max(0, subscribers - 1);
      if (subscribers === 0) stopLenis();
    };
  }, []);

  const scrollTo = useCallback((target: number | string | HTMLElement, options?: { offset?: number; immediate?: boolean }) => {
    scrollToSmooth(target, options);
  }, []);

  return { scrollTo };
}
