/**
 * career.ts — player and team career records built from Riot-verified custom games.
 * Mirrors GET /api/competitive/players/{id}/career and /teams/{id}/career (camelCased by competitiveApiClient).
 * Every ratio is null when it has no data; nothing is estimated.
 */

export type PlayerCareerAccess = 'self' | 'admin' | 'team_staff' | 'public' | 'none';
export type TeamCareerAccess = 'member' | 'public';
export type GameResult = 'win' | 'loss' | 'draw';
export type GameContext = 'scrim' | 'tournament';

export interface CareerSample {
  matches: number;
  rounds: number;
  from: string | null;
  to: string | null;
}

export interface PlayerTotals {
  matches: number;
  scrimMatches: number;
  tournamentMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRatePct: number | null;
  rounds: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number | null;
  kda: number | null;
  acs: number | null;
  adr: number | null;
  headshotSharePct: number | null;
  killsPerRound: number | null;
  deathsPerRound: number | null;
  assistsPerRound: number | null;
  firstKills: number;
  firstDeaths: number;
  multiKills: { k2: number; k3: number; k4: number; k5: number };
  plants: number;
  defuses: number;
}

export interface TeamTotals {
  matches: number;
  scrimMatches: number;
  tournamentMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRatePct: number | null;
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  roundWinRatePct: number | null;
  avgRoundsWon: number | null;
  avgRoundsLost: number | null;
  killsPerRound: number | null;
  deathsPerRound: number | null;
  damagePerRound: number | null;
  firstKillRatePct: number | null;
  firstDeathRatePct: number | null;
}

export interface AgentLine { characterId: string; matches: number; wins: number; winRatePct: number | null; kd: number | null; acs: number | null }
export interface MapLine { mapId: string; map: string; matches: number; wins: number; winRatePct: number | null }
export interface TeamLine { teamId: string | null; teamName: string | null; matches: number; wins: number; firstPlayed: string | null; lastPlayed: string | null }
export interface MonthLine { month: string; matches: number; wins: number }
export interface TeamAppearance { userId: string; username: string | null; matches: number; lastPlayed: string | null }

export interface PlayerCareerSummary {
  access: Exclude<PlayerCareerAccess, 'none'>;
  scope: 'all' | 'your_teams' | 'public';
  hasData: boolean;
  truncated: boolean;
  sample: CareerSample;
  totals: PlayerTotals;
  agents: AgentLine[];
  maps: MapLine[];
  teams: TeamLine[];
  activity: MonthLine[];
}

export type PlayerCareer = PlayerCareerSummary | { access: 'none' };

export interface TeamCareer {
  access: TeamCareerAccess;
  includesScrims: boolean;
  hasData: boolean;
  truncated: boolean;
  sample: CareerSample;
  totals: TeamTotals;
  form: Array<'W' | 'L' | 'D'>;
  maps: MapLine[];
  activity: MonthLine[];
  players: TeamAppearance[];
}

/** One game in a list. Player rows carry the agent and personal line; team rows do not. */
export interface CareerGame {
  startedAt: string | null;
  context: GameContext;
  scrimSessionId: string | null;
  tournamentMatchId: string | null;
  gameNumber: number | null;
  map: string | null;
  opponentName: string | null;
  result: GameResult;
  roundsWon: number | null;
  roundsLost: number | null;
  characterId?: string | null;
  teamName?: string | null;
  kills?: number;
  deaths?: number;
  assists?: number;
  acs?: number | null;
  adr?: number | null;
  headshotSharePct?: number | null;
}

export interface CareerGamesPage {
  access: string;
  matches: CareerGame[];
  nextBefore: string | null;
  hasMore: boolean;
}
