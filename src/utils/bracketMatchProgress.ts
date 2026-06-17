import type { BracketMatch } from '@/types/bracketTypes';

export function isEliminationStageFormat(format?: string | null): boolean {
  return format === 'single_elimination' || format === 'double_elimination';
}

/** Bracket order: round is authoritative; match_number resets each round. */
export function compareBracketMatchesDesc(a: BracketMatch, b: BracketMatch): number {
  const roundA = a.round ?? 0;
  const roundB = b.round ?? 0;
  if (roundA !== roundB) return roundB - roundA;
  return (b.matchNumber ?? 0) - (a.matchNumber ?? 0);
}

export function compareBracketMatchesAsc(a: BracketMatch, b: BracketMatch): number {
  const roundA = a.round ?? 0;
  const roundB = b.round ?? 0;
  if (roundA !== roundB) return roundA - roundB;
  return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
}

export function getBracketMaxRound(matches: BracketMatch[]): number {
  return matches.reduce((max, match) => Math.max(max, match.round ?? 0), 0);
}

export function isDoubleEliminationBracket(
  matches: Array<{ bracketSide?: string | null }>,
): boolean {
  return matches.some((match) => match.bracketSide === 'losers');
}

export function findLatestCompletedTeamMatch(
  matches: BracketMatch[],
  teamId: string,
): BracketMatch | null {
  const teamMatches = matches.filter(
    (match) =>
      (match.team1?.id === teamId || match.team2?.id === teamId)
      && match.status === 'completed',
  );

  if (!teamMatches.length) return null;
  return [...teamMatches].sort(compareBracketMatchesDesc)[0];
}

export function didTeamWinBracketMatch(match: BracketMatch, teamId: string): boolean {
  const isTeam1 = match.team1?.id === teamId;
  const isTeam2 = match.team2?.id === teamId;
  if (!isTeam1 && !isTeam2) return false;

  if (match.winner?.id === teamId) return true;
  if (match.winner?.id) return false;

  const myScore = isTeam1 ? match.team1_score : match.team2_score;
  const opponentScore = isTeam1 ? match.team2_score : match.team1_score;
  if (myScore == null || opponentScore == null) return false;
  return myScore > opponentScore;
}

export function readTournamentWinnerTeamId(
  tournament?: Record<string, unknown> | null,
): string | null {
  if (!tournament) return null;
  const candidate =
    tournament.winner_id
    ?? tournament.winner_team_id
    ?? tournament.winnerTeamId;
  return candidate ? String(candidate) : null;
}

/** Whether this match decides the tournament champion (single-elim final or grand final). */
export function isChampionshipBracketMatch(
  match: BracketMatch,
  matches: BracketMatch[],
): boolean {
  const side = match.bracketSide;
  if (side === 'final' || side === 'reset') return true;

  if (isDoubleEliminationBracket(matches)) {
    return false;
  }

  const maxRound = getBracketMaxRound(matches);
  return maxRound > 0 && (match.round ?? 0) === maxRound;
}

export function formatTeamMatchHistoryLabel(
  match: BracketMatch,
  allMatches: BracketMatch[],
): string {
  const isDE = isDoubleEliminationBracket(allMatches);
  const maxRound = getBracketMaxRound(allMatches);
  const round = match.round ?? 0;
  const matchNumber = match.matchNumber ?? 1;

  if (match.bracketSide === 'final') return 'Grand Finals';
  if (match.bracketSide === 'reset') return 'Grand Finals Reset';

  if (!isDE && round === maxRound && maxRound > 1) {
    return 'Finals';
  }

  if (!isDE && round === maxRound - 1 && maxRound >= 2) {
    return `Semi-Finals · Match ${matchNumber}`;
  }

  if (isDE) {
    const prefix = match.bracketSide === 'losers' ? 'Losers' : 'Winners';
    return `${prefix} R${round} · Match ${matchNumber}`;
  }

  return round > 1 ? `Round ${round} · Match ${matchNumber}` : `Match ${matchNumber}`;
}
