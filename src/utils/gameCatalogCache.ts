import catalogSync from '@/data/gameCatalogSync.json';
import type { CatalogGameApi, GameCatalogApiResponse } from '@/types/gameCatalog';
import { parseCatalogBrConfig } from '@/utils/gameCatalogBr';
import type {
  EsportsGame,
  GameFeatures,
  GameMode,
} from '@/utils/gameFeatures';

const CATALOG_STORAGE_KEY = 'esportra.game-catalog.snapshot';

let cachedGames: EsportsGame[] | null = null;
let cachedMeta: Pick<GameCatalogApiResponse, 'catalogVersion' | 'schemaVersion' | 'contentHash'> | null = null;

export function getCatalogGames(): EsportsGame[] | null {
  return cachedGames;
}

export function getCatalogMeta() {
  return cachedMeta;
}

/** Frontend sync manifest pinned to the backend seed catalog version/hash. */
export function getCatalogSyncManifest() {
  return catalogSync;
}

function isValidSnapshot(parsed: unknown): parsed is GameCatalogApiResponse {
  if (!parsed || typeof parsed !== 'object') return false;
  const candidate = parsed as GameCatalogApiResponse;
  return typeof candidate.catalogVersion === 'string'
    && typeof candidate.schemaVersion === 'number'
    && typeof candidate.contentHash === 'string'
    && /^[a-f0-9]{64}$/.test(candidate.contentHash)
    && Array.isArray(candidate.games)
    && candidate.games.length > 0
    && candidate.games.every((game) => typeof game.slug === 'string' && typeof game.name === 'string');
}

export function readStoredCatalogSnapshot(): GameCatalogApiResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSnapshot(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistSnapshot(response: GameCatalogApiResponse): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(response));
  } catch {
    // Ignore quota / private mode errors.
  }
}

/** Offline fallback from last-known-good API snapshot. */
export function getLocalFallbackGames(): EsportsGame[] {
  const snapshot = readStoredCatalogSnapshot();
  if (!snapshot) return [];
  return snapshot.games.map(catalogGameToEsportsGame);
}

export function getLocalFallbackMeta(): Pick<GameCatalogApiResponse, 'catalogVersion' | 'schemaVersion' | 'contentHash'> | null {
  const snapshot = readStoredCatalogSnapshot();
  if (!snapshot) return null;
  return {
    catalogVersion: snapshot.catalogVersion,
    schemaVersion: snapshot.schemaVersion,
    contentHash: snapshot.contentHash,
  };
}

function mapCatalogMode(mode: CatalogGameApi['modes'][number]): GameMode {
  const features = mode.features && Object.keys(mode.features).length > 0
    ? (mode.features as Partial<GameFeatures>)
    : undefined;

  return {
    name: mode.name,
    key: mode.modeKey,
    value: mode.modeKey,
    teamSize: mode.teamSize,
    participantMode: mode.participantMode === 'solo' ? 'solo' : 'team',
    allowsSubstitutes: mode.allowsSubstitutes,
    maxRosterSize: mode.maxRosterSize ?? undefined,
    maxSubstitutes: mode.maxSubstitutes ?? undefined,
    allowsCoaches: mode.allowsCoaches ?? true,
    maxCoaches: mode.maxCoaches ?? undefined,
    aliases: mode.aliases ?? [],
    modeGroup: mode.modeGroup ?? undefined,
    variantLabel: mode.variantLabel ?? undefined,
    mapPoolFilter: mode.mapPoolFilter === 'skirmish' || mode.mapPoolFilter === 'standard'
      ? mode.mapPoolFilter
      : undefined,
    features,
  };
}

export function catalogGameToEsportsGame(game: CatalogGameApi): EsportsGame {
  const modes = game.modes.map((mode) => mapCatalogMode(mode));
  const formats = modes.map((mode) => ({
    name: mode.name,
    value: mode.value,
    teamSize: mode.teamSize,
  }));

  const defaultStructure =
    game.tournamentStructures.find((structure) => structure.isDefault)?.structureKey
    ?? game.tournamentStructures[0]?.structureKey;

  return {
    name: game.name,
    slug: game.slug,
    category: game.category ?? '',
    type: game.gameType,
    formats,
    defaultFormat: game.defaultModeKey,
    modes,
    defaultMode: game.defaultModeKey,
    aliases: game.aliases ?? [],
    tournamentCapabilities: game.tournamentStructures.length
      ? {
          defaultStructure,
          supportedStructures: game.tournamentStructures.map((structure) => ({
            key: structure.structureKey,
            name: structure.name,
          })),
        }
      : undefined,
    logo: game.logo ?? '',
    features: game.features as GameFeatures,
    brConfig: parseCatalogBrConfig(game.brConfig),
  };
}

export function setGameCatalogFromApi(response: GameCatalogApiResponse): EsportsGame[] {
  cachedMeta = {
    catalogVersion: response.catalogVersion,
    schemaVersion: response.schemaVersion,
    contentHash: response.contentHash,
  };
  cachedGames = response.games.map(catalogGameToEsportsGame);
  persistSnapshot(response);
  return cachedGames;
}

export function clearGameCatalogCache(): void {
  cachedGames = null;
  cachedMeta = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(CATALOG_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
