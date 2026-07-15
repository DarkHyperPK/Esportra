// Game feature flags and helpers — reads from backend catalog cache (API) when loaded.

import type { BRConfig } from '@/types/battleRoyale';
import { catalogGameHasBRMaps, getCatalogMapPool } from '@/utils/gameCatalogBr';
import { getCatalogGames, getLocalFallbackGames } from '@/utils/gameCatalogCache';
import { resolveGameLogoUrl } from '@/utils/gameLogoResolver';

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
  maxSubstitutes?: number;
  allowsCoaches?: boolean;
  maxCoaches?: number;
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
  banner?: string | null;
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

const R6_FALLBACK_GAME: EsportsGame = {
  name: 'Rainbow Six Siege',
  slug: 'rainbow-six-siege',
  category: 'Tactical Shooter',
  type: 'team',
  formats: [{ name: '5v5', value: 'standard', teamSize: 5 }],
  defaultFormat: 'standard',
  modes: [{
    name: '5v5',
    key: 'standard',
    value: 'standard',
    teamSize: 5,
    participantMode: 'team',
    allowsSubstitutes: true,
    maxRosterSize: 7,
  }],
  defaultMode: 'standard',
  aliases: ['r6', 'r6s', 'siege', 'rainbow six', 'rainbow six siege'],
  tournamentCapabilities: {
    defaultStructure: 'single_elimination',
    supportedStructures: [
      { key: 'single_elimination', name: 'Single Elimination' },
      { key: 'double_elimination', name: 'Double Elimination' },
      { key: 'swiss', name: 'Swiss' },
      { key: 'round_robin', name: 'Round Robin' },
    ],
  },
  logo: '/games/r6s-logo.png',
  features: {
    ...DEFAULT_FEATURES,
    mapVeto: true,
    mapPool: true,
    mapPoolSize: 9,
    hasSidePick: true,
    isTeamGame: true,
    seriesFormats: ['bo1', 'bo3', 'bo5'],
  },
};

const normalize = (value: string | undefined | null) => (value || '').trim().toLowerCase();

function getAllGames(): EsportsGame[] {
  const games = getCatalogGames() ?? getLocalFallbackGames();
  const hasR6 = games.some(game => normalize(game.slug) === R6_FALLBACK_GAME.slug || normalize(game.name) === normalize(R6_FALLBACK_GAME.name));
  return hasR6 ? games : [...games, R6_FALLBACK_GAME];
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

/** Logo path for a game (catalog → static assets → IGDB manifest → placeholder). */
export function getGameLogo(gameName: string): string {
  const game = getGameByName(gameName);
  return resolveGameLogoUrl(gameName, game?.logo);
}

/** Canonical HTTPS banner URL from the active game catalog. */
export function getGameBannerUrl(gameName: string): string | null {
  return getGameByName(gameName)?.banner ?? null;
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
  const found = getGameModes(gameName).find(
    mode =>
      normalize(mode.key || mode.value) === normalized ||
      normalize(mode.value) === normalized ||
      normalize(mode.name) === normalized ||
      (mode.aliases || []).some(alias => normalize(alias) === normalized)
  );
  return found ?? getDefaultGameMode(gameName);
}

/** Get default team size for a game, optionally for a selected mode. */
export function getDefaultTeamSize(gameName: string, modeKey?: string | null): number {
  const mode = getGameMode(gameName, modeKey);
  return mode?.teamSize ?? 5;
}

/** Catalog-driven roster capacity for starters, substitutes, and coaches. */
export function getRosterLimits(gameName: string, modeKey?: string | null, fallbackTeamSize = 5) {
  const mode = getGameMode(gameName, modeKey);
  const starters = mode?.teamSize ?? fallbackTeamSize;
  const maxRoster = mode?.maxRosterSize ?? starters;
  const maxSubstitutes = mode?.maxSubstitutes ?? Math.max(maxRoster - starters, 0);
  const allowsCoaches = mode?.allowsCoaches !== false;
  const maxCoaches = allowsCoaches ? (mode?.maxCoaches ?? 2) : 0;
  return {
    starters,
    maxRoster,
    maxSubstitutes,
    allowsCoaches,
    maxCoaches,
    totalSlots: maxRoster + maxCoaches,
  };
}

/** Catalog participant mode for a game/mode pair. */
export function getParticipantMode(gameName: string, modeKey?: string | null): ParticipantMode {
  const mode = getGameMode(gameName, modeKey);
  return mode?.participantMode ?? ((mode?.teamSize ?? getDefaultTeamSize(gameName, modeKey)) > 1 ? 'team' : 'solo');
}

/** Whether registration should use the team flow (vs solo). */
export function isTeamRegistrationMode(
  gameName: string,
  modeKey?: string | null,
  participantMode?: ParticipantMode | string | null,
): boolean {
  if (participantMode === 'team' || participantMode === 'solo') {
    return participantMode === 'team';
  }
  return getParticipantMode(gameName, modeKey) === 'team';
}

/** Catalog indicates this game/mode integrates with Riot account linking. */
export function gameSupportsRiotAccountLink(gameName: string, modeKey?: string | null): boolean {
  return getEffectiveGameFeatures(gameName, modeKey).assistedReporting;
}

/**
 * Solo participant display: Riot ID for Riot esports titles (e.g. Valorant),
 * Esportra username for BR games (PUBG and other BR solo modes) even when a Riot tag exists.
 */
export function preferSoloRiotTagDisplay(gameName: string, modeKey?: string | null): boolean {
  const features = getEffectiveGameFeatures(gameName, modeKey);
  if (!features.assistedReporting) return false;
  if (isBattleRoyale(gameName)) return false;
  const mode = getGameMode(gameName, modeKey);
  if (mode?.features?.isBattleRoyale) return false;
  return true;
}

/** Esportra account name for solo participant cards (never Riot ID). */
export function resolveSoloEsportraDisplayName(
  participant: {
    solo_username?: string | null;
    display_name?: string | null;
    team_name?: string | null;
    gamer_tag?: string | null;
    user?: { username?: string | null } | null;
  },
): string {
  return (
    participant.solo_username ||
    participant.user?.username ||
    participant.display_name ||
    participant.gamer_tag ||
    participant.team_name ||
    'Unknown Player'
  );
}

/** Normalize API participant rows for list/history/card display. */
export function formatParticipantDisplay(participant: {
  entry_kind?: string | null;
  participant_type?: string | null;
  display_name?: string | null;
  display_logo_url?: string | null;
  solo_username?: string | null;
  solo_full_name?: string | null;
  solo_avatar_url?: string | null;
  team_name?: string | null;
  team_logo_url?: string | null;
  gamer_tag?: string | null;
  user?: { username?: string | null; avatar_url?: string | null } | null;
  team?: { name?: string | null; logo_url?: string | null } | Array<{ name?: string | null; logo_url?: string | null }> | null;
}): { name: string; avatar: string | null; type: string } {
  const teamObj = Array.isArray(participant.team) ? participant.team[0] : participant.team;
  const isSolo =
    participant.entry_kind === 'solo_player' ||
    participant.participant_type === 'solo' ||
    participant.participant_type === 'player';

  const name = isSolo
    ? (
        participant.display_name ||
        participant.solo_username ||
        participant.solo_full_name ||
        resolveSoloEsportraDisplayName(participant)
      )
    : (
        participant.display_name ||
        participant.team_name ||
        teamObj?.name ||
        'Unnamed Team'
      );

  const avatar = isSolo
    ? (participant.display_logo_url || participant.solo_avatar_url || participant.user?.avatar_url || null)
    : (participant.display_logo_url || participant.team_logo_url || teamObj?.logo_url || null);

  const type = isSolo ? 'player' : (participant.participant_type || 'team');

  return { name, avatar, type };
}

/** Resolve the primary label for a solo participant on public/organizer cards. */
export function resolveSoloParticipantDisplayName(
  participant: {
    solo_riot_tag?: string | null;
    solo_username?: string | null;
    display_name?: string | null;
    team_name?: string | null;
    gamer_tag?: string | null;
    user?: { riot_tag?: string | null; username?: string | null; steam_tag?: string | null } | null;
  },
  gameName: string,
  modeKey?: string | null,
): string {
  const preferRiotTag = preferSoloRiotTagDisplay(gameName, modeKey);
  const riotTag = participant.solo_riot_tag || participant.user?.riot_tag;
  const username =
    participant.solo_username ||
    participant.user?.username ||
    participant.display_name ||
    participant.gamer_tag ||
    participant.team_name;

  if (preferRiotTag && riotTag) return riotTag;
  return username || participant.user?.steam_tag || 'Unknown Player';
}

/** Tournament has assisted reporting enabled and catalog supports it. */
export function isAssistedMatchReportingEnabled(
  gameName: string,
  modeKey?: string | null,
  tournamentSettings?: { assistedMatchReporting?: boolean } | null,
): boolean {
  return tournamentSettings?.assistedMatchReporting === true
    && getEffectiveGameFeatures(gameName, modeKey).assistedReporting;
}

/** Check if a game is a Battle Royale type */
export function isBattleRoyale(gameName: string): boolean {
  const game = getGameByName(gameName);
  return game?.type === 'battle_royale' || game?.features?.isBattleRoyale === true;
}

/** Read persisted tournament format/type from API payloads (snake or camel case). */
export function getPersistedTournamentFormat(
  tournament?: {
    tournament_type?: string | null;
    tournamentType?: string | null;
    format?: string | null;
  } | null,
): string | null {
  return tournament?.tournament_type ?? tournament?.tournamentType ?? tournament?.format ?? null;
}

/** Prefer persisted tournament type when catalog cache is not loaded yet. */
export function isBattleRoyaleTournament(
  gameName?: string | null,
  tournamentType?: string | null,
  format?: string | null,
): boolean {
  for (const value of [tournamentType, format]) {
    const normalized = (value || '').trim().toLowerCase().replace(/-/g, '_');
    if (normalized === 'battle_royale') return true;
  }
  if (gameName) return isBattleRoyale(gameName);
  return false;
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
