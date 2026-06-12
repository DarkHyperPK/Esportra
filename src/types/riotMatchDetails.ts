export interface RoundTimelineEntry {
  round: number;
  winningTeam: string;
  resultCode?: string | null;
}

export interface EconomyTimelineEntry {
  round: number;
  blueSpent: number;
  redSpent: number;
}

export interface RiotDerivedMatchDetails {
  roundTimeline?: RoundTimelineEntry[];
  economyTimeline?: EconomyTimelineEntry[];
}

export function hasRiotDerivedDetails(details?: RiotDerivedMatchDetails | null): boolean {
  return Boolean(details?.roundTimeline?.length || details?.economyTimeline?.length);
}
