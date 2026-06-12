export interface RoundTimelineEntry {
  round: number;
  displayRound?: number;
  winningTeam: string;
  resultCode?: string | null;
  result?: string | null;
  displayResult?: string | null;
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
  displayName?: string;
  displayIcon?: string | null;
  roundCount: number;
}

export interface RiotMatchInfo {
  matchId?: string | null;
  mapId?: string | null;
  displayMapName?: string | null;
  gameVersion?: string | null;
  gameLengthMillis?: number;
  region?: string | null;
  gameStartMillis?: number;
  queueId?: string | null;
  gameMode?: string | null;
  displayGameMode?: string | null;
  isRanked?: boolean;
  isCompleted?: boolean;
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

export function resolveDisplayRound(round: RoundTimelineEntry): number {
  return round.displayRound ?? round.round;
}

export function resolveWeaponLabel(entry: WeaponSummaryEntry): string {
  return entry.displayName || entry.weapon;
}
