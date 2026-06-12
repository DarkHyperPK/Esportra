export type RiotTeamSide = 'Blue' | 'Red';

export interface AbilityCasts {
  grenadeCasts?: number;
  ability1Casts?: number;
  ability2Casts?: number;
  ultimateCasts?: number;
}

export interface ScoreboardPlayer {
  puuid?: string;
  gameName?: string;
  tagLine?: string;
  teamId?: string | number;
  characterId?: string | number;
  displayAgentName?: string;
  displayAgentIcon?: string | null;
  kills?: number;
  deaths?: number;
  assists?: number;
  score?: number;
  roundsPlayed?: number;
  acs?: number;
  adr?: number;
  hsPct?: number;
  kdRatio?: number;
  firstBloods?: number;
  abilityCasts?: AbilityCasts | null;
  isTeam1?: boolean;
  isTeam2?: boolean;
}

export function resolvePlayerAcs(player: ScoreboardPlayer): number | null {
  if (typeof player.acs === 'number' && Number.isFinite(player.acs)) return Math.round(player.acs);
  if (
    typeof player.score === 'number'
    && typeof player.roundsPlayed === 'number'
    && player.roundsPlayed > 0
  ) {
    return Math.round(player.score / player.roundsPlayed);
  }
  return null;
}

export function resolvePlayerKdRatio(player: ScoreboardPlayer): number | null {
  if (typeof player.kdRatio === 'number' && Number.isFinite(player.kdRatio)) return player.kdRatio;
  const kills = player.kills ?? 0;
  const deaths = player.deaths ?? 0;
  if (deaths === 0) return kills > 0 ? kills : null;
  return Math.round((kills / deaths) * 100) / 100;
}

export function formatStat(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return digits > 0 ? value.toFixed(digits) : String(Math.round(value));
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${Math.round(value)}%`;
}

export function formatAbilityCasts(casts?: AbilityCasts | null): string {
  if (!casts) return '-';
  const total = (casts.grenadeCasts ?? 0)
    + (casts.ability1Casts ?? 0)
    + (casts.ability2Casts ?? 0)
    + (casts.ultimateCasts ?? 0);
  return total > 0 ? String(total) : '-';
}
