import { apiClient } from '@/lib/apiClient';

const CAPTAIN_MATCH_NOTIFICATION_TYPES = new Set([
  'match_ready',
  'match_walkover',
  'result_disputed',
  'dispute_resolved',
  'dispute_rejected',
  'veto_your_turn',
  'veto_completed',
]);

const LEGACY_CAPTAIN_LINK = '/tournaments/captain';
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildCaptainMatchRoomLink(
  tournamentSlug: string | null | undefined,
  tournamentId: string | null | undefined,
  matchId: string,
): string {
  const slug =
    tournamentSlug
    || (tournamentId && !GUID_RE.test(tournamentId) ? tournamentId : null);

  if (slug && matchId) {
    return `/tournaments/${slug}/captain-match/${matchId}`;
  }

  return '/tournaments';
}

function isValidCaptainMatchLink(link: string | null | undefined): boolean {
  return !!link && link.includes('/captain-match/') && link !== LEGACY_CAPTAIN_LINK;
}

export function resolveCaptainMatchNotificationLink(notification: {
  link?: string | null;
  type?: string;
  data?: Record<string, unknown> | null;
}): string | null {
  const data = notification.data ?? {};
  const matchId = typeof data.match_id === 'string' ? data.match_id : null;
  const tournamentSlug = typeof data.tournament_slug === 'string' ? data.tournament_slug : null;

  if (tournamentSlug && matchId) {
    return buildCaptainMatchRoomLink(tournamentSlug, null, matchId);
  }

  const link = notification.link ?? '';
  if (isValidCaptainMatchLink(link)) {
    return link;
  }

  const isCaptainMatchType =
    !!notification.type && CAPTAIN_MATCH_NOTIFICATION_TYPES.has(notification.type);
  const isLegacyCaptainLink =
    link === LEGACY_CAPTAIN_LINK || link.endsWith('/captain');

  if ((isCaptainMatchType || isLegacyCaptainLink) && matchId) {
    return null;
  }

  return link || null;
}

export async function resolveCaptainMatchNotificationLinkAsync(notification: {
  link?: string | null;
  type?: string;
  data?: Record<string, unknown> | null;
}): Promise<string | null> {
  const resolved = resolveCaptainMatchNotificationLink(notification);
  if (resolved) return resolved;

  const matchId = typeof notification.data?.match_id === 'string'
    ? notification.data.match_id
    : null;
  if (!matchId) return notification.link ?? null;

  try {
    const room = await apiClient.get<{
      link?: string;
      tournament_slug?: string;
    }>(`/api/matches/${matchId}/captain-room-link`);
    if (room?.link && isValidCaptainMatchLink(room.link)) {
      return room.link;
    }
    if (room?.tournament_slug) {
      return buildCaptainMatchRoomLink(room.tournament_slug, null, matchId);
    }
  } catch {
    // Fall through to tournaments list
  }

  return '/tournaments';
}
