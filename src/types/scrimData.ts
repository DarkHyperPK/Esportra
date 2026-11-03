/**
 * scrimData.ts — "Your scrims data": a team's own scrim record built from confirmed scrim maps.
 * Mirrors GET /api/scrims/teams/{teamId}/data (camelCased by competitiveApiClient).
 * Each map has a data tier; a figure is null when the sources behind it do not provide it.
 */

/** full = an auto-fetched Riot game (round-level detail) · screenshot = the OCR scoreboard (limited) · score_only = just the result. */
export type DataTier = 'full' | 'screenshot' | 'score_only';
export type MapSignal = 'strong' | 'weak' | 'typical' | 'insufficient_sample';
export type GameResult = 'win' | 'loss' | 'draw';

export interface Coverage {
  maps: number;
  full: number;
  screenshot: number;
  scoreOnly: number;
  /** Riot maps whose data has not arrived or been checked yet. */
  riotPending: number;
  /** Riot maps whose data disagreed with the report, so only the result counts. */
  riotNotVerified: number;
  /** Maps reported but not yet confirmed by the other team: not counted. */
  awaitingConfirmation: number;
  disputed: number;
}

export interface TeamRecord {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRatePct: number | null;
  winLowPct: number | null;
  winHighPct: number | null;
  roundsWon: number;
  roundsLost: number;
  roundWinRatePct: number | null;
}

export interface SideLine { played: number; won: number; pct: number | null }

export interface MapIntel {
  mapId: string;
  map: string;
  games: number;
  wins: number;
  winRatePct: number | null;
  winLowPct: number | null;
  winHighPct: number | null;
  roundsWon: number;
  roundsLost: number;
  roundWinRatePct: number | null;
  attack: SideLine;
  defense: SideLine;
  lastPlayed: string | null;
  signal: MapSignal;
}

export interface CompositionIntel {
  agents: string[];
  games: number;
  wins: number;
  winRatePct: number | null;
  roundWinRatePct: number | null;
  attack: SideLine;
  defense: SideLine;
  maps: Array<{ map: string; games: number; wins: number }>;
  lastPlayed: string | null;
}

export interface PlayerSummary {
  userId: string;
  name: string | null;
  games: number;
  wins: number;
  fullGames: number;
  screenshotGames: number;
  winRatePct: number | null;
  kd: number | null;
  kda: number | null;
  kdaGames: number;
  acs: number | null;
  adr: number | null;
  statGames: number;
  hsPct: number | null;
  firstKills: number;
  firstDeaths: number | null;
  firstDeathGames: number;
  plants: number;
  defuses: number;
  agents: Array<{ characterId: string; games: number }>;
}

export interface LineupIntel {
  userIds: string[];
  names: Array<string | null>;
  complete: boolean;
  games: number;
  wins: number;
  winRatePct: number | null;
  roundWinRatePct: number | null;
  lastPlayed: string | null;
}

export interface RecordLine { games: number; wins: number }

export interface RosterIntel {
  lineups: LineupIntel[];
  stability: { distinctLineups: number; completeLineups: number; mostUsedSharePct: number | null; playersUsed: number; gamesWithKnownPlayers: number };
  substitutes: { gamesWith: number; winsWith: number; winRateWithPct: number | null; gamesWithout: number; winsWithout: number; winRateWithoutPct: number | null };
  pairs: Array<{ names: Array<string | null>; together: RecordLine; firstWithoutSecond: RecordLine; secondWithoutFirst: RecordLine }>;
}

export interface RecentMap {
  sessionId: string;
  gameNumber: number;
  playedAt: string | null;
  map: string | null;
  opponent: string | null;
  result: GameResult;
  roundsWon: number | null;
  roundsLost: number | null;
  tier: DataTier;
}

export interface MonthLine { month: string; games: number; wins: number }

export interface ScrimData {
  teamId: string;
  coverage: Coverage;
  hasData: boolean;
  truncated: boolean;
  minMapSample: number;
  sample: { maps: number; from: string | null; to: string | null };
  record: TeamRecord;
  form: Array<'W' | 'L' | 'D'>;
  activity: MonthLine[];
  maps: MapIntel[];
  unplayedMaps: string[];
  compositions: CompositionIntel[];
  players: PlayerSummary[];
  roster: RosterIntel;
  recent: RecentMap[];
}
