import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import type { MatchDetailsPayload } from '@/types/matchDetails';
import type { OcrDraft, OcrDraftPlayer, TeamSlot } from '@/types/scoreboardOcr';
import type { RiotTeamSide, ScoreboardPlayer } from '@/types/scoreboardPlayer';

/** Screenshot reports always place bracket team1 on "Blue" so existing scoreboard views can render them. */
const sideOf = (team: TeamSlot): RiotTeamSide => (team === 'team1' ? 'Blue' : 'Red');

export interface OcrSubmissionContext {
  matchId: string;
  gameNumber: number;
  reportedByTeamId: string;
  reporterSlot: TeamSlot;
  team1Id: string;
  team2Id: string;
  mapName?: string;
  mapId?: string;
}

export interface OcrReportSubmission {
  gameNumber: number;
  reportedByTeamId: string;
  team1Score: number;
  team2Score: number;
  winnerTeamId: string;
  mapId?: string;
  mapName?: string;
  matchData: MatchDetailsPayload;
  screenshotUrls: string[];
  source: 'ocr';
  ocrParseId: string;
}

function toScoreboardPlayer(player: OcrDraftPlayer, index: number, parseId: string, roundsPlayed: number): ScoreboardPlayer {
  const team = player.team ?? 'team1';
  const { acs = null, kills = null, deaths = null, assists = null, hsPct = null, adr = null, firstBloods = null } = player.stats;
  return {
    puuid: `ocr-${parseId}-${index}`,
    gameName: player.name.trim(),
    teamId: sideOf(team),
    characterId: player.agentId ?? undefined,
    kills: kills ?? undefined,
    deaths: deaths ?? undefined,
    assists: assists ?? undefined,
    acs: acs ?? undefined,
    score: acs !== null ? acs * roundsPlayed : undefined,
    roundsPlayed,
    hsPct: hsPct ?? undefined,
    adr: adr ?? undefined,
    firstBloods: firstBloods ?? undefined,
    isTeam1: team === 'team1',
    isTeam2: team === 'team2',
    userId: player.userId ?? undefined,
  };
}

function toSnapshot(draft: OcrDraft, players: ScoreboardPlayer[], t1: number, t2: number, matchId: string): EnrichedRiotMatchData {
  const roundsPlayed = t1 + t2;
  return {
    matchInfo: { matchId: `ocr:${draft.parseId}`, mapId: draft.mapUrl ?? undefined, isCompleted: true },
    teams: [
      { teamId: 'Blue', won: t1 > t2, roundsWon: t1, roundsPlayed },
      { teamId: 'Red', won: t2 > t1, roundsWon: t2, roundsPlayed },
    ],
    players: players.map((p) => ({
      puuid: p.puuid ?? '',
      gameName: p.gameName,
      teamId: String(p.teamId),
      characterId: p.characterId !== undefined ? String(p.characterId) : undefined,
      stats: { kills: p.kills ?? 0, deaths: p.deaths ?? 0, assists: p.assists ?? 0, score: p.score ?? 0, roundsPlayed },
    })),
    enrichedPlayers: players,
    ocrSource: { parseId: draft.parseId, matchId },
  };
}

/** Build the report body. Call only with a draft that passed `ocrReviewSchema`. */
export function buildOcrSubmission(draft: OcrDraft, ctx: OcrSubmissionContext): OcrReportSubmission {
  const t1 = draft.team1Score ?? 0;
  const t2 = draft.team2Score ?? 0;
  const players = draft.players.map((p, i) => toScoreboardPlayer(p, i, draft.parseId, t1 + t2));
  return {
    gameNumber: ctx.gameNumber,
    reportedByTeamId: ctx.reportedByTeamId,
    team1Score: t1,
    team2Score: t2,
    winnerTeamId: t1 > t2 ? ctx.team1Id : ctx.team2Id,
    mapId: draft.mapId ?? ctx.mapId,
    mapName: draft.mapName ?? ctx.mapName,
    matchData: {
      players,
      blueTeam: { roundsWon: t1, won: t1 > t2 },
      redTeam: { roundsWon: t2, won: t2 > t1 },
      reporterSide: sideOf(ctx.reporterSlot),
      reportedByTeamId: ctx.reportedByTeamId,
      t1Side: 'Blue',
      enrichedSnapshot: toSnapshot(draft, players, t1, t2, ctx.matchId),
      source: 'ocr',
    },
    screenshotUrls: [draft.screenshotUrl],
    source: 'ocr',
    ocrParseId: draft.parseId,
  };
}
