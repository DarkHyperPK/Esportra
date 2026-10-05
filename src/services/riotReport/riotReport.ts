import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';

export interface RiotReportContext {
  gameNumber: number;
  /** The reporting competitor (team, or solo participant). */
  userTeamId: string;
  team1Id?: string;
  team2Id?: string;
  mapId?: string;
  mapName?: string;
  /** Evidence, e.g. the uploaded scoreboard screenshot. */
  screenshotUrls?: string[];
}

export interface RiotReportBody {
  gameNumber: number;
  riotMatchId: string;
  mapId?: string;
  mapName?: string;
  team1Score: number;
  team2Score: number;
  winnerTeamId: string;
  reportedByTeamId: string;
  screenshotUrls?: string[];
  matchData: Record<string, unknown>;
}

/**
 * A report body for a Riot game, in bracket terms: the reporter's side and score become team1/team2,
 * and Riot's players, timelines and match info go along unchanged. The enriched snapshot is added by
 * the caller (it needs a request).
 */
export function riotReportBody(candidate: RiotMatchCandidate, ctx: RiotReportContext): RiotReportBody {
  const isTeam1 = ctx.userTeamId === ctx.team1Id;
  const reporterWon = candidate.result === 'Victory';
  const blueWon = candidate.blueTeam.won;
  // Without the reporter's side, it follows from who won: winning on Blue, or losing when Blue won, etc.
  const reporterSide = candidate.reporterSide ?? (reporterWon === blueWon ? 'Blue' : 'Red');
  const team1Score = isTeam1 ? candidate.myTeamScore : candidate.enemyTeamScore;
  const team2Score = isTeam1 ? candidate.enemyTeamScore : candidate.myTeamScore;
  const loserOfReporter = isTeam1 ? ctx.team2Id : ctx.team1Id;
  const winnerTeamId = (reporterWon ? ctx.userTeamId : loserOfReporter) ?? '';
  // Riot side of bracket team1: the reporter's side when they are team1, else the other one.
  const t1Side = isTeam1 ? reporterSide : reporterSide === 'Blue' ? 'Red' : 'Blue';

  return {
    gameNumber: ctx.gameNumber,
    riotMatchId: candidate.id,
    mapId: ctx.mapId || undefined,
    mapName: candidate.map || ctx.mapName,
    team1Score,
    team2Score,
    winnerTeamId,
    reportedByTeamId: ctx.userTeamId,
    screenshotUrls: ctx.screenshotUrls,
    matchData: {
      players: candidate.players,
      blueTeam: candidate.blueTeam,
      redTeam: candidate.redTeam,
      queueId: candidate.queueId,
      gameLengthMillis: candidate.gameLengthMillis,
      startTime: candidate.startTime,
      reporterResult: candidate.result,
      reporterKda: candidate.kda,
      reporterSide,
      reportedByTeamId: ctx.userTeamId,
      t1Side,
      roundTimeline: candidate.roundTimeline,
      economyTimeline: candidate.economyTimeline,
      weaponSummaries: candidate.weaponSummaries,
      matchInfo: candidate.matchInfo,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRounds(value: unknown): boolean {
  return isRecord(value) && typeof value.roundsWon === 'number' && typeof value.won === 'boolean';
}

/** A candidate the API sent is only reported automatically when it has everything a report needs. */
export function isRiotCandidate(value: unknown): value is RiotMatchCandidate {
  return isRecord(value)
    && typeof value.id === 'string' && value.id.length > 0
    && typeof value.map === 'string'
    && typeof value.myTeamScore === 'number' && typeof value.enemyTeamScore === 'number'
    && (value.result === 'Victory' || value.result === 'Defeat')
    && (value.reporterSide === undefined || value.reporterSide === 'Blue' || value.reporterSide === 'Red')
    && isRounds(value.blueTeam) && isRounds(value.redTeam)
    && Array.isArray(value.players) && value.players.length > 0;
}
