import { ApiError } from '@/lib/apiClient';

const START_MESSAGES: Record<string, string> = {
  RIOT_NOT_LINKED: 'Link your Riot account first. Squad Up pairs you with players near your Valorant rank.',
  NOT_RANKED: 'You need a ranked Valorant profile with synced stats to start Squad Up.',
  REGION_UNKNOWN: 'We could not detect your Valorant region yet. Re-sync your Riot account and try again.',
};

function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return null;
  const code = (error.body as { error?: unknown }).error;
  return typeof code === 'string' ? code : null;
}

function errorBody(error: unknown): Record<string, unknown> | null {
  return error instanceof ApiError && typeof error.body === 'object' && error.body !== null ? error.body as Record<string, unknown> : null;
}

export function squadUpStartErrorMessage(error: unknown): string {
  const code = errorCode(error);
  if (code === 'SQUAD_UP_RESTRICTED') {
    const until = errorBody(error)?.until;
    const date = typeof until === 'string' ? new Date(until) : null;
    return date && !Number.isNaN(date.getTime())
      ? `You can't use Squad Up until ${date.toLocaleString()} because of a report.`
      : "You can't use Squad Up because of a report.";
  }
  if (code && START_MESSAGES[code]) return START_MESSAGES[code];
  return error instanceof Error ? error.message : 'Could not start Squad Up. Please try again.';
}

/** Swipes can fail because the other player left or timed out. */
export function squadUpSwipeErrorMessage(error: unknown): string {
  if (errorCode(error) === 'TARGET_NOT_ACTIVE') return 'That player just left Squad Up.';
  if (errorCode(error) === 'NO_ACTIVE_SESSION') return 'Your Squad Up session ended. Start again to keep swiping.';
  return error instanceof Error ? error.message : 'That swipe did not go through. Try again.';
}

const REPORT_MESSAGES: Record<string, string> = {
  NOT_REPORTABLE: 'You can only report players you have seen in Squad Up or matched with in the last 7 days.',
  ALREADY_REPORTED: 'You already reported this player in the last 24 hours. Our team will review it.',
  TOO_MANY_REPORTS: 'You have sent several reports in the last hour. Please try again later.',
  INVALID_IMAGE: 'One of the images is not a valid PNG, JPG or WebP screenshot under 10 MB.',
  TOO_MANY_FILES: 'You can attach up to 5 screenshots.',
  INVALID_PROOF_LINK: 'The proof link must start with https://',
  DETAILS_REQUIRED: 'Tell us a little more (at least 10 characters).',
  SELF_REPORT: 'You cannot report yourself.',
  STORAGE_FAILED: 'We could not save your screenshots. Please try again.',
};

export function squadUpReportErrorMessage(error: unknown): string {
  const code = errorCode(error);
  if (code && REPORT_MESSAGES[code]) return REPORT_MESSAGES[code];
  return error instanceof Error ? error.message : 'Your report could not be sent. Please try again.';
}

const LOBBY_MESSAGES: Record<string, string> = {
  LOBBY_EXISTS: 'You already have a lobby open. Close it before opening another.',
  LOBBY_FULL: 'That lobby just filled up.',
  ALREADY_REQUESTED: 'You already asked to join this lobby.',
  REMOVED_FROM_LOBBY: 'The host removed you from this lobby.',
  LOBBY_NOT_FOUND: 'That lobby closed or is no longer open to you.',
  REQUEST_NOT_FOUND: 'That request was already handled.',
  NOT_A_MEMBER: 'That player is no longer in the lobby.',
  INVALID_SLOTS: 'Choose between 1 and 4 open slots.',
  TITLE_TOO_LONG: 'Keep the title under 60 characters.',
};

export function squadUpLobbyErrorMessage(error: unknown): string {
  const code = errorCode(error);
  if (code && LOBBY_MESSAGES[code]) return LOBBY_MESSAGES[code];
  return squadUpStartErrorMessage(error);
}
