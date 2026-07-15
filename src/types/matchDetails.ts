import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import type {
  EconomyTimelineEntry,
  RiotMatchInfo,
  RoundTimelineEntry,
  WeaponSummaryEntry,
} from '@/types/riotMatchDetails';

export interface MatchDetailsPayload {
  players?: ScoreboardPlayer[];
  blueTeam?: { roundsWon: number; won: boolean };
  redTeam?: { roundsWon: number; won: boolean };
  queueId?: string;
  gameLengthMillis?: number;
  startTime?: number;
  reporterResult?: string;
  reporterKda?: string;
  reporterSide?: 'Blue' | 'Red';
  reportedByTeamId?: string;
  t1Side?: 'Blue' | 'Red';
  matchInfo?: RiotMatchInfo | null;
  roundTimeline?: RoundTimelineEntry[];
  economyTimeline?: EconomyTimelineEntry[];
  weaponSummaries?: WeaponSummaryEntry[];
  enrichedSnapshot?: EnrichedRiotMatchData;
}
