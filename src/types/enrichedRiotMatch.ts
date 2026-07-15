import type {
  EconomyTimelineEntry,
  RiotMatchInfo,
  RiotRoundResult,
  RoundTimelineEntry,
  WeaponSummaryEntry,
} from '@/types/riotMatchDetails';
import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';

/** Raw Riot MatchDto plus server-parsed derived fields from `/api/integrations/riot/enriched-match`. */
export interface EnrichedRiotMatchData {
  matchInfo: {
    matchId?: string;
    mapId?: string;
    queueId?: string;
    gameMode?: string;
    isRanked?: boolean;
    region?: string;
    gameVersion?: string;
    gameLengthMillis?: number;
    gameStartMillis?: number;
    isCompleted?: boolean;
    gameServerAddress?: string;
  };
  teams: Array<{ teamId: string; won: boolean; roundsWon: number; roundsPlayed?: number }>;
  players: Array<{
    puuid: string;
    gameName?: string;
    tagLine?: string;
    teamId: string;
    characterId?: string;
    competitiveTier?: number;
    stats: {
      kills: number;
      deaths: number;
      assists: number;
      score: number;
      roundsPlayed?: number;
      abilityCasts?: {
        grenadeCasts?: number;
        ability1Casts?: number;
        ability2Casts?: number;
        ultimateCasts?: number;
      };
    };
  }>;
  roundResults?: RiotRoundResult[];
  enrichedPlayers?: ScoreboardPlayer[];
  matchInfoParsed?: RiotMatchInfo | null;
  roundTimeline?: RoundTimelineEntry[];
  economyTimeline?: EconomyTimelineEntry[];
  weaponSummaries?: WeaponSummaryEntry[];
}

export function hasEnrichedRiotDetails(match: EnrichedRiotMatchData): boolean {
  return Boolean(
    match.roundTimeline?.length
    || match.economyTimeline?.length
    || match.weaponSummaries?.length,
  );
}

export function resolveEnrichedPlayer(
  match: EnrichedRiotMatchData,
  puuid: string,
): ScoreboardPlayer | undefined {
  return match.enrichedPlayers?.find((player) => player.puuid === puuid);
}
