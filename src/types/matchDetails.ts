import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';
import type { EconomyTimelineEntry, RoundTimelineEntry } from '@/types/riotMatchDetails';

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
  roundTimeline?: RoundTimelineEntry[];
  economyTimeline?: EconomyTimelineEntry[];
}
