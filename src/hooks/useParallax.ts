import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * hero-parallax: attaches a scroll listener and updates transform on the
 * returned ref element directly (no re-render).
 * Cleans up listener and removes will-change on unmount.
 * No-op when prefers-reduced-motion is active.
 */
export function useParallax(
  coefficient: number,
  maxOffset: number,
): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) return;

    el.style.willChange = 'transform';

    function onScroll() {
      if (!el) return;
      const offset = Math.min(window.scrollY * coefficient, maxOffset);
      el.style.transform = `translateY(${offset}px)`;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (el) {
        el.style.willChange = '';
        el.style.transform = '';
      }
    };
  }, [coefficient, maxOffset, prefersReducedMotion]);

  return ref;
}
