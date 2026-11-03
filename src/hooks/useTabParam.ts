import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Which tab is open, kept in the URL as `?tab=` so a tab can be linked and survives a reload. Other query parameters
 * (like `team_id`) are kept; an unknown value falls back to the default; switching replaces the history entry so Back
 * leaves the page instead of stepping through every tab.
 */
export function useTabParam<T extends string>(allowed: readonly T[], fallback: T): [T, (tab: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const value = (allowed as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback;
  const set = useCallback((tab: T) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === fallback) next.delete('tab'); else next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [fallback, setParams]);
  return [value, set];
}
