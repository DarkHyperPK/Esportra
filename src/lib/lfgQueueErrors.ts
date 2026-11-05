import { ApiError } from '@/lib/apiClient';

const START_MESSAGES: Record<string, string> = {
  RIOT_NOT_LINKED: 'Link your Riot account first. Queue Now matches you by your Valorant rank.',
  NOT_RANKED: 'You need a ranked Valorant profile with synced stats to join the queue.',
  REGION_UNKNOWN: 'We could not detect your Valorant region yet. Re-sync your Riot account and try again.',
};

function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return null;
  const code = (error.body as { error?: unknown }).error;
  return typeof code === 'string' ? code : null;
}

export function queueStartErrorMessage(error: unknown): string {
  const code = errorCode(error);
  if (code && START_MESSAGES[code]) return START_MESSAGES[code];
  return error instanceof Error ? error.message : 'Could not join the queue. Please try again.';
}

/** Swipes can fail because the other player left or timed out. */
export function queueSwipeErrorMessage(error: unknown): string {
  if (errorCode(error) === 'TARGET_NOT_ACTIVE') return 'That player just left the queue.';
  if (errorCode(error) === 'NO_ACTIVE_SESSION') return 'Your queue session ended. Join again to keep swiping.';
  return error instanceof Error ? error.message : 'That swipe did not go through. Try again.';
}
