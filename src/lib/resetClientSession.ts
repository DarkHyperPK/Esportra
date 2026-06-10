import type { QueryClient } from '@tanstack/react-query';
import { clearGhostModeSession } from '@/lib/ghostModeSession';

const USER_LOCAL_KEYS = [
  'sessionRole',
  'steam_just_linked',
  'admin_roles_updated',
  'tournament_wizard_draft',
  'tournament_wizard_step',
  'venue_list_data',
  'venue_list_step',
] as const;

const USER_LOCAL_PREFIXES = [
  'country_detection_attempted_',
  'esportra_verification_draft_',
  'rawg_cache_',
] as const;

/** Remove auth tokens and per-user localStorage entries. */
export function clearUserBrowserStorage(): void {
  if (typeof window === 'undefined') return;

  for (const key of USER_LOCAL_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
        continue;
      }
      if (USER_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }

  clearGhostModeSession();
}

/** Drop in-memory TanStack Query data so the next account cannot read the previous user's cache. */
export function resetClientSessionCache(queryClient: QueryClient): void {
  void queryClient.cancelQueries();
  queryClient.clear();
}

/** Full client reset on sign-out or authenticated user change. */
export function resetClientSessionForAuthChange(queryClient: QueryClient): void {
  clearUserBrowserStorage();
  resetClientSessionCache(queryClient);
}
