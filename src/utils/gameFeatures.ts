// Game feature flags and helpers for the esportsGames registry

import esportsGames from '@/data/esportsGames.json';
import type { BRConfig } from '@/types/battleRoyale';

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

export type ParticipantMode = 'solo' | 'team';

export interface GameMode extends GameFormat {
  key?: string;
  participantMode?: ParticipantMode;
  allowsSubstitutes?: boolean;
  maxRosterSize?: number;
  aliases?: string[];
}

export interface TournamentStructureCapability {
  key: string;
  name: string;
}

export interface TournamentCapabilities {
  defaultStructure: string;
  supportedStructures: TournamentStructureCapability[];
}

export interface EsportsGame {
  name: string;
  slug: string;
  category: string;
  type: string;
  formats: GameFormat[];
  defaultFormat: string;
  modes?: GameMode[];
  defaultMode?: string;
  aliases?: string[];
  tournamentCapabilities?: TournamentCapabilities;
  logo: string;
  features: GameFeatures;
  brConfig?: BRConfig;
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

const normalize = (value: string | undefined | null) => (value || '').trim().toLowerCase();

/** Find a game by name, slug, or alias (case-insensitive) */
export function getGameByName(gameName: string): EsportsGame | undefined {
  const normalized = normalize(gameName);
  return (esportsGames.games as EsportsGame[]).find(
    g =>
      normalize(g.name) === normalized ||
      normalize(g.slug) === normalized ||
      (g.aliases || []).some(alias => normalize(alias) === normalized)
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

/** Get catalog modes for a game, falling back to legacy formats. */
export function getGameModes(gameName: string): GameMode[] {
  const game = getGameByName(gameName);
  return game?.modes?.length ? game.modes : (game?.formats || []);
}

/** Get default mode for a game. */
export function getDefaultGameMode(gameName: string): GameMode | undefined {
  const game = getGameByName(gameName);
  if (!game) return undefined;
  const modes = getGameModes(gameName);
  const defaultKey = game.defaultMode || game.defaultFormat;
  return modes.find(m => normalize(m.key || m.value) === normalize(defaultKey)) ?? modes[0];
}

/** Get a specific game mode by key, value, name, or alias. */
export function getGameMode(gameName: string, modeKey?: string | null): GameMode | undefined {
  if (!modeKey) return getDefaultGameMode(gameName);
  const normalized = normalize(modeKey);
  return getGameModes(gameName).find(
    mode =>
      normalize(mode.key || mode.value) === normalized ||
      normalize(mode.value) === normalized ||
      normalize(mode.name) === normalized ||
      (mode.aliases || []).some(alias => normalize(alias) === normalized)
  );
}

/** Get default team size for a game, optionally for a selected mode. */
export function getDefaultTeamSize(gameName: string, modeKey?: string | null): number {
  const mode = getGameMode(gameName, modeKey);
  return mode?.teamSize ?? 5;
}

/** Check if a game is a Battle Royale type */
export function isBattleRoyale(gameName: string): boolean {
  const game = getGameByName(gameName);
  return game?.type === 'battle_royale' || game?.features?.isBattleRoyale === true;
}

/** Get BR config for a game (returns undefined for non-BR games) */
export function getBRConfig(gameName: string): BRConfig | undefined {
  const game = getGameByName(gameName);
  return game?.brConfig;
}
