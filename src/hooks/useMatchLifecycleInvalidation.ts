import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateMatchLifecycleQueries,
  type MatchLifecycleScope,
} from '@/utils/matchLifecycleQueries';

const DEFAULT_DEBOUNCE_MS = 1500;

/**
 * Debounced, scope-aware invalidation for match lifecycle events.
 * Scope is read at flush time so version/match ids can change between schedule and run.
 */
export function useMatchLifecycleInvalidation(
  scope: MatchLifecycleScope,
  debounceMs = DEFAULT_DEBOUNCE_MS,
) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const invalidateNow = useCallback(() => {
    invalidateMatchLifecycleQueries(queryClient, scopeRef.current);
  }, [queryClient]);

  const invalidateDebounced = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      invalidateMatchLifecycleQueries(queryClient, scopeRef.current);
    }, debounceMs);
  }, [queryClient, debounceMs]);

  return { invalidateNow, invalidateDebounced };
}

export default useMatchLifecycleInvalidation;
