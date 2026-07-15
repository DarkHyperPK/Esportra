// Battle Royale tournament types

export interface BRScoringPreset {
  name: string;
  /** Points by placement position (index 0 = 1st place) */
  placements: number[];
  /** Points per kill/elimination */
  killPoints: number;
  /** Max kill points per game (null = unlimited) */
  killCap: number | null;
}

export type BRMapMode = 'none' | 'fixed_stage' | 'per_round' | 'rotation';

export type BRStageFormat =
  | 'single_lobby'
  | 'static_groups'
  | 'group_rotation'
  | 'multi_lobby_cut';

export type BRLeaderboardScope =
  | 'stage_global'
  | 'per_seed_group'
  | 'per_lobby';

export type BRLobbyFormationMode =
  | 'single'
  | 'parallel_fixed'
  | 'rotating_pairwise';

export type BRAdvancementMode =
  | 'top_n_per_group'
  | 'top_n_per_lobby'
  | 'top_n_overall'
  | 'threshold'
  | 'none';

export type BRTiebreaker = 'most_wins' | 'most_kills' | 'head_to_head';

export interface BRMapCatalogItem {
  name: string;
  imageUrl?: string | null;
}

export interface BRMapCatalog {
  hasMaps: boolean;
  pool?: string[];
  items?: BRMapCatalogItem[];
}

export interface BRMapConfig {
  mode: BRMapMode;
  pool: string[];
  fixedMap: string | null;
}

/** @deprecated Scoring is tournament-wide only — do not write stage scoring overrides. */
export interface BRStageScoringOverride {
  presetKey?: string;
  custom?: BRScoringPreset | null;
  killCap?: number | null;
}

export interface BRAdvancementConfig {
  mode: BRAdvancementMode;
  perGroup?: number;
  perLobby?: number;
  overall?: number;
  threshold?: number;
}

export interface MatchupWave {
  wave: number;
  lobbies: string[][];
}

export interface BRLobbyFormationConfig {
  mode: BRLobbyFormationMode;
  seedGroupCount?: number;
  groupsPerLobby?: number;
  lobbyCount?: number;
  lobbySize?: number;
  matchupSchedule?: 'auto' | MatchupWave[];
  matchesPerWave?: number;
}

export interface BRStageConfig {
  /** @deprecated Tournament wizard owns scoring — ignored at runtime */
  scoring?: BRStageScoringOverride | null;
  format?: BRStageFormat;
  /** Games played inside each physical lobby (Cash Cup model). */
  gamesPerLobby?: number | null;
  /** @deprecated Use gamesPerLobby */
  gameCount?: number | null;
  leaderboardScope?: BRLeaderboardScope;
  lobbyFormation?: BRLobbyFormationConfig | null;
  advancement?: BRAdvancementConfig | null;
  map?: Partial<BRMapConfig> | null;
}

export interface BRTournamentSettings {
  gameCount: number;
  scoringPreset: string;
  customScoring?: BRScoringPreset;
  killCap: number | null;
  tiebreaker: BRTiebreaker;
}

export interface BRTournamentSettingsExtended extends BRTournamentSettings {
  brDefaultLobbySize?: number;
  brDefaultGameCount?: number;
  brDefaultMapMode?: BRMapMode;
}

export interface ResolvedStageBRConfig {
  scoringPreset: BRScoringPreset;
  killCap: number | null;
  tiebreaker: BRTiebreaker;
  gameCount: number;
  gamesPerLobby: number;
  lobbySize: number | null;
  format: BRStageFormat;
  leaderboardScope: BRLeaderboardScope;
  lobbyFormation: BRLobbyFormationConfig | null;
  advancement: BRAdvancementConfig | null;
  map: BRMapConfig;
}

export interface BRConfig {
  playersPerLobby: number;
  defaultGameCount: number;
  scoringPresets: Record<string, BRScoringPreset>;
  defaultPreset: string;
  maps?: BRMapCatalog;
  defaultMapMode?: BRMapMode;
}

export interface BRGameResult {
  gameNumber: number;
  results: BRTeamResult[];
}

export interface BRTeamResult {
  teamId: string;
  teamName?: string;
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
}

export interface BRLeaderboardEntry {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  totalPoints: number;
  totalKills: number;
  totalPlacementPoints: number;
  totalKillPoints: number;
  gamesPlayed: number;
  wins: number;
  bestPlacement: number;
  perGameResults: {
    gameNumber: number;
    placement: number;
    kills: number;
    points: number;
  }[];
}

export interface BREvidence {
  teamId: string;
  teamName: string;
  imageUrl: string;
  submittedAt: string;
  placement?: number;
  kills?: number;
  reviewed?: boolean;
  gameNumber?: number;
}

export const DEFAULT_BR_SETTINGS: BRTournamentSettings = {
  gameCount: 6,
  scoringPreset: 'custom',
  killCap: null,
  tiebreaker: 'most_wins',
};
