export interface RoundTimelineEntry {
  round: number;
  winningTeam: string;
  resultCode?: string | null;
  result?: string | null;
  plantSite?: string | null;
}

export interface EconomyTimelineEntry {
  round: number;
  blueSpent: number;
  redSpent: number;
  blueLoadout?: number;
  redLoadout?: number;
}

export interface WeaponSummaryEntry {
  weapon: string;
  roundCount: number;
}

export interface RiotMatchInfo {
  matchId?: string | null;
  mapId?: string | null;
  gameVersion?: string | null;
  gameLengthMillis?: number;
  region?: string | null;
  gameStartMillis?: number;
  queueId?: string | null;
  gameMode?: string | null;
  isRanked?: boolean;
  isCompleted?: boolean;
}

export interface RiotMapPoint {
  x: number;
  y: number;
}

export interface RiotPlayerLocation {
  puuid: string;
  viewRadians?: number;
  location?: RiotMapPoint | null;
}

export interface RiotFinishingDamage {
  damageType?: string | null;
  damageItem?: string | null;
  isSecondaryFireMode?: boolean;
}

export interface RiotKillEvent {
  gameTime?: number;
  roundTime?: number;
  timeSinceRoundStartMillis?: number;
  killer?: string | null;
  victim?: string | null;
  victimLocation?: RiotMapPoint | null;
  assistants?: string[];
  playerLocations?: RiotPlayerLocation[];
  finishingDamage?: RiotFinishingDamage | null;
}

export interface RiotRoundPlayerStats {
  puuid: string;
  kills?: RiotKillEvent[];
  economy?: { spent?: number; loadoutValue?: number };
  damage?: Array<{ receiver?: string; damage?: number; headshots?: number; bodyshots?: number; legshots?: number }>;
}

export interface RiotRoundResult {
  roundNum?: number;
  roundResult?: string | null;
  roundResultCode?: string | null;
  winningTeam?: string | null;
  bombPlanter?: string | null;
  bombDefuser?: string | null;
  plantRoundTime?: number;
  plantPlayerLocations?: RiotPlayerLocation[];
  plantLocation?: RiotMapPoint | null;
  plantSite?: string | null;
  defuseRoundTime?: number;
  defusePlayerLocations?: RiotPlayerLocation[];
  defuseLocation?: RiotMapPoint | null;
  playerStats?: RiotRoundPlayerStats[];
}

export interface AbilityCasts {
  grenadeCasts?: number;
  ability1Casts?: number;
  ability2Casts?: number;
  ultimateCasts?: number;
}

export interface RiotDerivedMatchDetails {
  roundTimeline?: RoundTimelineEntry[];
  economyTimeline?: EconomyTimelineEntry[];
  weaponSummaries?: WeaponSummaryEntry[];
  matchInfo?: RiotMatchInfo | null;
}

export function hasRiotDerivedDetails(details?: RiotDerivedMatchDetails | null): boolean {
  return Boolean(
    details?.roundTimeline?.length
    || details?.economyTimeline?.length
    || details?.weaponSummaries?.length,
  );
}

export function resolveRoundResultCode(round: RoundTimelineEntry): string | null {
  return round.resultCode || round.result || null;
}
