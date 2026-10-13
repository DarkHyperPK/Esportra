/**
 * Pure rules for broadcast node health classification.
 * All thresholds are in milliseconds.
 */

/** Node sends heartbeats every 2s. Online if lastSeen < 15s ago. */
export const ONLINE_THRESHOLD_MS = 15_000;

/** Stale if lastSeen is 15–60s ago. */
export const STALE_THRESHOLD_MS = 60_000;

export type NodeHealthState = 'online' | 'stale' | 'offline';

/**
 * Classify a node's health given its `lastSeenAt` ISO timestamp.
 *
 * @param lastSeenAt - ISO string from the backend, or null if never seen.
 * @param now - The current Date (pass for testability).
 */
export function classifyNodeHealth(lastSeenAt: string | null, now: Date): NodeHealthState {
  if (!lastSeenAt) return 'offline';

  const elapsed = now.getTime() - Date.parse(lastSeenAt);
  if (!Number.isFinite(elapsed) || elapsed < -30_000) return 'offline';

  if (elapsed < ONLINE_THRESHOLD_MS) return 'online';
  if (elapsed < STALE_THRESHOLD_MS) return 'stale';
  return 'offline';
}

/** True when the node needs operator attention (stale or offline). */
export function nodeNeedsAttention(health: NodeHealthState): boolean {
  return health === 'stale' || health === 'offline';
}

/** Human-readable "Last seen N minutes ago" label for stale/offline nodes. */
export function relativeLastSeen(lastSeenAt: string | null, now: Date): string {
  if (!lastSeenAt) return 'Never';

  const seconds = Math.floor((now.getTime() - Date.parse(lastSeenAt)) / 1_000);
  if (!Number.isFinite(seconds)) return 'Unknown';
  if (seconds < -30) return 'Clock mismatch';
  if (seconds < 0) return 'Just now';

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
