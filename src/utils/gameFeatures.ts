// Game feature flags and helpers — reads from backend catalog cache (API) when loaded.

import type { BRConfig } from '@/types/battleRoyale';
import { catalogGameHasBRMaps, getCatalogMapPool } from '@/utils/gameCatalogBr';
import { getCatalogGames, getLocalFallbackGames } from '@/utils/gameCatalogCache';

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
  modeGroup?: string;
  variantLabel?: string;
  mapPoolFilter?: 'standard' | 'skirmish';
  features?: Partial<GameFeatures>;
}

export interface GameModeGroup {
  key: string;
  label: string;
  modes: GameMode[];
  isGrouped: boolean;
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

function getAllGames(): EsportsGame[] {
  return getCatalogGames() ?? getLocalFallbackGames();
}

/** Find a game by name, slug, or alias (case-insensitive) */
export function getGameByName(gameName: string): EsportsGame | undefined {
  const normalized = normalize(gameName);
  return getAllGames().find(
    g =>
      normalize(g.name) === normalized ||
      normalize(g.slug) === normalized ||
      (g.aliases || []).some(alias => normalize(alias) === normalized)
  );
}

/** All catalog games (API cache when loaded, otherwise bundled fallback). */
export function listCatalogGames(): EsportsGame[] {
  return getAllGames();
}

/** Logo path for a game (from catalog cache or bundled fallback). */
export function getGameLogo(gameName: string): string {
  return getGameByName(gameName)?.logo ?? '';
}

/** Get feature flags for a game (returns defaults if game not found) */
export function getGameFeatures(gameName: string): GameFeatures {
  const game = getGameByName(gameName);
  return game?.features ?? DEFAULT_FEATURES;
}

/** Merge game-level and mode-level feature flags (mode overrides win). */
export function getEffectiveGameFeatures(gameName: string, modeKey?: string | null): GameFeatures {
  const base = getGameFeatures(gameName);
  const mode = getGameMode(gameName, modeKey);
  if (!mode?.features) return base;
  return { ...base, ...mode.features };
}

/** Whether the selected catalog mode uses the Skirmish map pool. */
export function isSkirmishGameMode(gameName: string, modeKey?: string | null): boolean {
  const mode = getGameMode(gameName, modeKey);
  if (!mode) return false;
  if (mode.mapPoolFilter === 'skirmish') return true;
  return normalize(mode.modeGroup) === 'skirmish'
    || normalize(mode.key || mode.value).includes('skirmish');
}

/** Check if a game supports map veto */
export function gameHasMapVeto(gameName: string, modeKey?: string | null): boolean {
  return getEffectiveGameFeatures(gameName, modeKey).mapVeto;
}

/** Check if a game has a map pool */
export function gameHasMapPool(gameName: string, modeKey?: string | null): boolean {
  return getEffectiveGameFeatures(gameName, modeKey).mapPool;
}

/** Get catalog modes for a game, falling back to legacy formats. */
export function getGameModes(gameName: string): GameMode[] {
  const game = getGameByName(gameName);
  return game?.modes?.length ? game.modes : (game?.formats || []);
}

/** Get grouped catalog modes for a game. */
export function getGameModeGroups(gameName: string): GameModeGroup[] {
  const groups = new Map<string, GameModeGroup>();

  for (const mode of getGameModes(gameName)) {
    const flatKey = mode.key || mode.value;
    const groupKey = mode.modeGroup ? normalize(mode.modeGroup) : flatKey;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.modes.push(mode);
      existing.isGrouped = true;
    } else {
      groups.set(groupKey, {
        key: groupKey,
        label: mode.modeGroup || mode.name,
        modes: [mode],
        isGrouped: Boolean(mode.modeGroup),
      });
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    modes: group.modes.sort((a, b) => a.teamSize - b.teamSize || a.name.localeCompare(b.name)),
  }));
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

/** Whether the game catalog defines BR map pools for this game. */
export function gameHasBRMaps(gameName: string): boolean {
  return catalogGameHasBRMaps(getBRConfig(gameName));
}

/** Map pool names from the active catalog (backend when loaded). */
export function getBRMapPool(gameName: string, _modeKey?: string | null): string[] {
  return getCatalogMapPool(getBRConfig(gameName));
}
