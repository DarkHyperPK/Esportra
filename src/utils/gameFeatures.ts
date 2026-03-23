// Game feature flags and helpers for the esportsGames registry

import esportsGames from '@/data/esportsGames.json';

export interface GameFeatures {
  mapVeto: boolean;
  mapPool: boolean;
  mapPoolSize: number;
  assistedReporting: boolean;
  seriesFormats: string[];
  hasSidePick: boolean;
  isTeamGame: boolean;
  isBattleRoyale: boolean;
}

export interface GameFormat {
  name: string;
  value: string;
  teamSize: number;
}

export interface EsportsGame {
  name: string;
  slug: string;
  category: string;
  type: string;
  formats: GameFormat[];
  defaultFormat: string;
  logo: string;
  features: GameFeatures;
}

const DEFAULT_FEATURES: GameFeatures = {
  mapVeto: false,
  mapPool: false,
  mapPoolSize: 0,
  assistedReporting: false,
  seriesFormats: ['bo1', 'bo3', 'bo5'],
  hasSidePick: false,
  isTeamGame: true,
  isBattleRoyale: false,
};

/** Find a game by name (case-insensitive) */
export function getGameByName(gameName: string): EsportsGame | undefined {
  return (esportsGames.games as EsportsGame[]).find(
    g => g.name.toLowerCase() === gameName.toLowerCase()
  );
}

/** Get feature flags for a game (returns defaults if game not found) */
export function getGameFeatures(gameName: string): GameFeatures {
  const game = getGameByName(gameName);
  return game?.features ?? DEFAULT_FEATURES;
}

/** Check if a game supports map veto */
export function gameHasMapVeto(gameName: string): boolean {
  return getGameFeatures(gameName).mapVeto;
}

/** Check if a game has a map pool */
export function gameHasMapPool(gameName: string): boolean {
  return getGameFeatures(gameName).mapPool;
}

/** Get default team size for a game */
export function getDefaultTeamSize(gameName: string): number {
  const game = getGameByName(gameName);
  if (!game) return 5;
  const defaultFmt = game.formats.find(f => f.value === game.defaultFormat);
  return defaultFmt?.teamSize ?? game.formats[0]?.teamSize ?? 5;
}
