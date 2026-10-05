import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';

/** A Riot custom game as a result candidate (from Auto-fetch's history scan or a matched screenshot). */
export interface RiotMatchCandidate {
  id: string;
  map: string;
  mapId: string;
  queueId: string;
  startTime: number;
  gameLengthMillis: number;
  myTeamScore: number;
  enemyTeamScore: number;
  reporterSide?: 'Blue' | 'Red';
  score: string;
  result: 'Victory' | 'Defeat';
  kda: string;
  agent: string;
  isExpectedMap?: boolean;
  blueTeam: { roundsWon: number; won: boolean };
  redTeam: { roundsWon: number; won: boolean };
  /** Riot's per-player payload, passed through to the report as-is. */
  players: ScoreboardPlayer[];
  roundTimeline?: Array<{ round: number; winningTeam: string; resultCode?: string | null; result?: string | null; plantSite?: string | null }>;
  economyTimeline?: Array<{ round: number; blueSpent: number; redSpent: number; blueLoadout?: number; redLoadout?: number }>;
  weaponSummaries?: Array<{ weapon: string; roundCount: number }>;
  matchInfo?: {
    mapId?: string | null;
    gameMode?: string | null;
    region?: string | null;
    isRanked?: boolean;
  } | null;
}
