import type { BracketMatch } from '@/types/bracketTypes';
import type { MatchRoomPhase } from '@/hooks/useMatchRoomState';
import { matchIdsEqual, toRawMatchId } from '@/utils/bracketMatchId';

const PLAYABLE_STATUSES = new Set<BracketMatch['status']>(['pending', 'in_progress']);

export function isPlayableMatchStatus(status: string | null | undefined): boolean {
  return PLAYABLE_STATUSES.has(status as BracketMatch['status']);
}

export function findMatchInList(
  matches: BracketMatch[],
  matchId: string,
): BracketMatch | undefined {
  return matches.find((m) => matchIdsEqual(m.id, matchId));
}

/** Earliest pending/in-progress match for a competitor, bracket-order. */
export function findNextTeamMatch(
  matches: BracketMatch[],
  teamId: string,
): BracketMatch | null {
  const teamMatches = matches.filter(
    (m) => m.team1?.id === teamId || m.team2?.id === teamId,
  );

  const sorted = [...teamMatches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return (a.matchNumber || 0) - (b.matchNumber || 0);
  });

  return sorted.find((m) => isPlayableMatchStatus(m.status)) ?? null;
}

export interface ResolveActiveMatchInput {
  matches: BracketMatch[];
  userTeamId?: string;
  urlMatchId?: string;
  /** Organizer/staff deep-link fetch — authoritative for focused room */
  focusMatch?: BracketMatch | null;
  canManageMatchRoom: boolean;
  isOrganizerMatchView: boolean;
}

export interface ActiveMatchResolution {
  activeMatch: BracketMatch | null;
  /** Replace `/captain-match/:matchId` with base route so selection logic can advance */
  shouldUnpinUrl: boolean;
  /** Completed match from a notification/deep link (for history context) */
  urlCompletedMatch: BracketMatch | null;
}

/**
 * Single source of truth for which match drives the captain/organizer match room.
 *
 * - Captains: never stay pinned to a completed match from a URL; advance to next playable.
 * - Organizers (deep link): stay on the focused match but rely on lifecycle invalidation for fresh data.
 * - Default: earliest playable match for the user's team.
 */
export function resolveActiveMatch(input: ResolveActiveMatchInput): ActiveMatchResolution {
  const {
    matches,
    userTeamId,
    urlMatchId,
    focusMatch,
    canManageMatchRoom,
    isOrganizerMatchView,
  } = input;

  const empty: ActiveMatchResolution = {
    activeMatch: null,
    shouldUnpinUrl: false,
    urlCompletedMatch: null,
  };

  if (isOrganizerMatchView && urlMatchId && focusMatch) {
    return {
      activeMatch: focusMatch,
      shouldUnpinUrl: false,
      urlCompletedMatch: focusMatch.status === 'completed' ? focusMatch : null,
    };
  }

  if (!matches.length) return empty;

  if (urlMatchId) {
    const urlMatch = findMatchInList(matches, urlMatchId);
    const isUsersMatch = Boolean(
      userTeamId
      && urlMatch
      && (urlMatch.team1?.id === userTeamId || urlMatch.team2?.id === userTeamId),
    );

    if (urlMatch && (canManageMatchRoom || isUsersMatch)) {
      if (isPlayableMatchStatus(urlMatch.status)) {
        return { activeMatch: urlMatch, shouldUnpinUrl: false, urlCompletedMatch: null };
      }

      if (userTeamId && !isOrganizerMatchView) {
        return {
          activeMatch: findNextTeamMatch(matches, userTeamId),
          shouldUnpinUrl: true,
          urlCompletedMatch: urlMatch,
        };
      }

      if (canManageMatchRoom) {
        return {
          activeMatch: urlMatch,
          shouldUnpinUrl: false,
          urlCompletedMatch: urlMatch,
        };
      }
    }
  }

  if (!userTeamId) return empty;

  return {
    activeMatch: findNextTeamMatch(matches, userTeamId),
    shouldUnpinUrl: false,
    urlCompletedMatch: null,
  };
}

/** Whether scoring/disputes are finished for this match room. */
export function isBracketMatchSettled(
  match: BracketMatch | null | undefined,
  roomPhase?: MatchRoomPhase | null,
): boolean {
  if (!match) return false;
  if (roomPhase === 'completed') return true;
  if (match.status !== 'completed') return false;
  return Boolean(
    match.winner?.id
    || match.team1_score != null
    || match.team2_score != null,
  );
}

export { toRawMatchId };
