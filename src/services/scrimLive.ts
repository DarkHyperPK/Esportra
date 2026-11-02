/**
 * scrimLive.ts
 *
 * Rules for keeping scrim screens fresh. Scrim changes already arrive live as
 * notifications over the notification hub; these rules decide which of them
 * refresh the scrim queries, and how often to poll as a safety net when a
 * push is missed (e.g. a dropped connection).
 */

import type { ScrimSessionStatus } from '@/types/competitive';

/** Any scrim notification means scrim data may have changed. A prefix keeps new types covered. */
export function shouldRefreshScrims(type: string | null | undefined): boolean {
  return !!type && type.startsWith('scrim_');
}

export const SESSION_POLL_MS = 20_000;
export const TEAM_SESSIONS_POLL_MS = 60_000;

const LIVE_STATUSES: readonly ScrimSessionStatus[] = ['scheduled', 'in_progress', 'disputed'];

/** Poll a single scrim only while it can still change. Pass to refetchInterval. */
export function sessionPollInterval(status: ScrimSessionStatus | undefined): number | false {
  return status && LIVE_STATUSES.includes(status) ? SESSION_POLL_MS : false;
}

/** Poll the team's session list only while at least one scrim is live. */
export function teamSessionsPollInterval(sessions: ReadonlyArray<{ status: ScrimSessionStatus }> | undefined): number | false {
  return sessions?.some((s) => LIVE_STATUSES.includes(s.status)) ? TEAM_SESSIONS_POLL_MS : false;
}
