/** Screenshot scoreboard OCR — wire types from POST /api/matches/{id}/reports/parse-screenshot. */

export interface OcrField<T> {
  value: T | null;
  confidence: number;
}

export type OcrSide = 'ally' | 'enemy';
export type TeamSlot = 'team1' | 'team2';
export type OcrOutcome = 'victory' | 'defeat' | 'draw';

export const OCR_STAT_KEYS = [
  'acs',
  'kills',
  'deaths',
  'assists',
  'econ',
  'firstBloods',
  'plants',
  'defuses',
  'hsPct',
  'adr',
] as const;

export type OcrStatKey = (typeof OCR_STAT_KEYS)[number];

export interface OcrMapRef {
  name: string;
  uuid?: string | null;
  mapUrl?: string | null;
}

export interface OcrAgentRef {
  uuid: string;
  name: string;
  role?: string | null;
}

export interface OcrRosterMatch {
  userId: string;
  team: TeamSlot;
  matchedName: string;
  score: number;
}

export interface OcrPlayerRow {
  side: OcrSide | null;
  sideConfidence: number;
  name: OcrField<string>;
  rosterMatch?: OcrRosterMatch | null;
  agent: OcrField<OcrAgentRef>;
  stats: Partial<Record<OcrStatKey, OcrField<number>>>;
}

export interface OcrWarning {
  code: string;
  message: string;
  playerIndex?: number | null;
}

export interface ScoreboardOcrResult {
  game: 'valorant';
  parserVersion: string;
  engineVersion: string;
  outcome: OcrField<OcrOutcome>;
  allyScore: OcrField<number>;
  enemyScore: OcrField<number>;
  map: OcrField<OcrMapRef>;
  allyTeam: OcrField<TeamSlot>;
  columns: string[];
  players: OcrPlayerRow[];
  warnings: OcrWarning[];
}

export interface ScoreboardOcrParse {
  parseId: string;
  screenshotUrl: string;
  mapId: string | null;
  team1Id: string;
  team2Id: string;
  result: ScoreboardOcrResult;
}

/** One editable row in the captain's review. Values are what will be submitted. */
export interface OcrDraftPlayer {
  key: string;
  team: TeamSlot | null;
  name: string;
  userId: string | null;
  agentId: string | null;
  stats: Partial<Record<OcrStatKey, number | null>>;
  /** Fields the reader was unsure about — highlighted until the captain edits them. */
  uncertain: Array<OcrStatKey | 'name' | 'agent' | 'team'>;
}

export interface OcrDraft {
  parseId: string;
  screenshotUrl: string;
  mapId: string | null;
  mapName: string | null;
  mapUrl: string | null;
  team1Score: number | null;
  team2Score: number | null;
  uncertainScore: boolean;
  columns: OcrStatKey[];
  players: OcrDraftPlayer[];
  warnings: OcrWarning[];
}
