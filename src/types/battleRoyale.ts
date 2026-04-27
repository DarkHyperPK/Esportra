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

export interface BRConfig {
  playersPerLobby: number;
  defaultGameCount: number;
  scoringPresets: Record<string, BRScoringPreset>;
  defaultPreset: string;
}

export interface BRTournamentSettings {
  gameCount: number;
  scoringPreset: string;
  customScoring?: BRScoringPreset;
  killCap: number | null;
  tiebreaker: 'most_wins' | 'most_kills' | 'head_to_head';
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
  perGameResults?: {
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
}

export const DEFAULT_BR_SETTINGS: BRTournamentSettings = {
  gameCount: 6,
  scoringPreset: 'custom',
  killCap: null,
  tiebreaker: 'most_wins',
};
