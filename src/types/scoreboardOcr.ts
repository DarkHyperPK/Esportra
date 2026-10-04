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
  'trades',
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
  /** valorant-api uuid; null for an agent valorant-api doesn't list yet (the name is still known). */
  uuid: string | null;
  name: string;
  role?: string | null;
}

export type OcrNameSource = 'riot_verified' | 'riot_previous' | 'riot_claimed' | 'username';

export interface OcrRosterMatch {
  userId: string;
  team: TeamSlot;
  matchedName: string;
  score: number;
  source?: OcrNameSource | null;
  /** "elimination": the name couldn't be read; this was the team's only unmatched player. */
  method?: 'read' | 'elimination';
}

export interface OcrPlayerRow {
  side: OcrSide | null;
  sideConfidence: number;
  name: OcrField<string>;
  /** Exactly what the screenshot showed, before roster matching replaced it with the Riot spelling. */
  nameRead?: string | null;
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
  /** Match date printed on the screenshot (ISO). */
  playedOn?: OcrField<string>;
  /** Horizontal stretch measured on the capture (1 = native); stretched captures are straightened. */
  captureStretch?: number;
  allyTeam: OcrField<TeamSlot>;
  columns: string[];
  players: OcrPlayerRow[];
  warnings: OcrWarning[];
}

/** Per-player check of a screenshot report against the competitors' rosters (computed by the API). */
export type VerificationStatus =
  | 'verified'
  | 'claimed'
  | 'username_only'
  | 'unconfirmed'
  | 'edited'
  | 'other_team'
  | 'duplicate'
  | 'unknown';

/** Per-player check against Riot's own record of the match, by PUUID (the screenshot has no #tags). */
export type RiotStatus = 'confirmed' | 'other_account' | 'not_in_match' | 'unregistered';

export interface VerifiedPlayer {
  index: number;
  name: string;
  team: TeamSlot | null;
  userId: string | null;
  status: VerificationStatus;
  source: OcrNameSource | null;
  readName: string | null;
  riotStatus?: RiotStatus | null;
  /** Full Riot ID ("name#tag") of the account Riot lists for this row. */
  riotId?: string | null;
  /** Riot's K/D/A when the submitted one differs. */
  riotKda?: string | null;
}

export type VerificationFlag = 'screenshot_reused' | 'date_mismatch' | 'stats_mismatch' | 'score_mismatch';

export type RiotCheckStatus = 'pending' | 'confirmed' | 'not_found' | 'unavailable';

export interface RiotCheck {
  status: RiotCheckStatus;
  matchId?: string | null;
  checkedAt?: string | null;
}

export interface OcrVerification {
  players: VerifiedPlayer[];
  flags: VerificationFlag[];
  riot?: RiotCheck | null;
}

export interface ScoreboardOcrParse {
  parseId: string;
  screenshotUrl: string;
  mapId: string | null;
  team1Id: string;
  team2Id: string;
  result: ScoreboardOcrResult;
  verification?: OcrVerification | null;
}

/** One editable row in the captain's review. Values are what will be submitted. */
export interface OcrDraftPlayer {
  key: string;
  team: TeamSlot | null;
  name: string;
  userId: string | null;
  agentId: string | null;
  /** Agent name; set even when valorant-api has no uuid for the agent yet. */
  agentName: string | null;
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

/** Staff OCR test bench (/debug/riot/ocr). */
export interface ScoreboardOcrDebugResponse {
  elapsedMs: number;
  result: ScoreboardOcrResult;
  verification?: OcrVerification | null;
}

export interface ScoreboardOcrHealth {
  configured: boolean;
  reachable: boolean;
  /** Agent icons from valorant-api. */
  agents: number;
  /** Agents the service recognises from real in-game portraits. */
  bankAgents?: number;
  /** Installed recognisers: "default" plus e.g. "arabic", "korean". */
  scripts?: string[];
  /** Recognisers not loaded yet, with the reason. The service keeps retrying the download. */
  missingScripts?: Record<string, string>;
  catalogVersion?: string | null;
  refreshedAt?: string | null;
}

/** Expected-values file in services/scoreboard-ocr/tests/fixtures/real/<name>.json. */
export interface ScoreboardOcrFixture {
  outcome: OcrOutcome | null;
  ally: number | null;
  enemy: number | null;
  map: string | null;
  rows: Array<{
    side: OcrSide | null;
    name: string | null;
    kills: number | null;
    deaths: number | null;
    assists: number | null;
    firstBloods: number | null;
    plants: number | null;
    defuses: number | null;
  }>;
}
