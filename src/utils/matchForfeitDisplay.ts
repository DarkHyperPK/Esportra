import { competitorIdsMatch } from '@/utils/competitorId';

export type MatchOutcome = 'double_forfeit' | 'walkover' | null;
export type ForfeitReason =
  | 'neither_checked_in'
  | 'team1_not_checked_in'
  | 'team2_not_checked_in'
  | null;

export interface CheckinForfeitDisplay {
  title: string;
  description: string;
  tone: 'forfeit' | 'walkover_win';
}

export function normalizeMatchOutcome(value: unknown): MatchOutcome {
  if (value === 'double_forfeit' || value === 'walkover') return value;
  return null;
}

export function normalizeForfeitReason(value: unknown): ForfeitReason {
  if (
    value === 'neither_checked_in'
    || value === 'team1_not_checked_in'
    || value === 'team2_not_checked_in'
  ) {
    return value;
  }
  return null;
}

export function getCheckinForfeitDisplay(input: {
  matchOutcome?: MatchOutcome;
  forfeitReason?: ForfeitReason;
  userTeamId?: string;
  team1Id?: string;
  team2Id?: string;
}): CheckinForfeitDisplay | null {
  const { matchOutcome, forfeitReason, userTeamId, team1Id, team2Id } = input;
  if (!matchOutcome) return null;

  if (matchOutcome === 'double_forfeit') {
    return {
      title: 'Match Forfeited',
      description: 'Neither team checked in before the check-in deadline.',
      tone: 'forfeit',
    };
  }

  if (matchOutcome === 'walkover' && forfeitReason === 'team1_not_checked_in') {
    if (competitorIdsMatch(userTeamId, team1Id)) {
      return {
        title: 'Match Forfeited',
        description: 'Your team did not check in before the deadline.',
        tone: 'forfeit',
      };
    }

    return {
      title: 'Walkover Win',
      description: 'Your opponent did not check in before the deadline.',
      tone: 'walkover_win',
    };
  }

  if (matchOutcome === 'walkover' && forfeitReason === 'team2_not_checked_in') {
    if (competitorIdsMatch(userTeamId, team2Id)) {
      return {
        title: 'Match Forfeited',
        description: 'Your team did not check in before the deadline.',
        tone: 'forfeit',
      };
    }

    return {
      title: 'Walkover Win',
      description: 'Your opponent did not check in before the deadline.',
      tone: 'walkover_win',
    };
  }

  return null;
}
