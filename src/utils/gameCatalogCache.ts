import catalogAssets from '@/data/gameCatalogAssets.json';
import catalogSync from '@/data/gameCatalogSync.json';
import type { CatalogGameApi, GameCatalogApiResponse } from '@/types/gameCatalog';
import { parseCatalogBrConfig } from '@/utils/gameCatalogBr';
import type {
  EsportsGame,
  GameFeatures,
  GameMode,
} from '@/utils/gameFeatures';

export type GameCatalogAssetModeOverlay = {
  modeKey: string;
  mapPoolFilter?: 'standard' | 'skirmish';
  features?: Partial<GameFeatures>;
};

export type GameCatalogAssetGame = {
  slug: string;
  name: string;
  logo: string;
  aliases: string[];
  modeOverlays?: GameCatalogAssetModeOverlay[];
};

type GameCatalogAssetsFile = {
  catalogVersion: string;
  schemaVersion: number;
  games: GameCatalogAssetGame[];
};

const assetsFile = catalogAssets as GameCatalogAssetsFile;
const assetBySlug = new Map(assetsFile.games.map((game) => [game.slug, game]));

let cachedGames: EsportsGame[] | null = null;
let cachedMeta: Pick<GameCatalogApiResponse, 'catalogVersion' | 'schemaVersion' | 'contentHash'> | null = null;

export function getCatalogGames(): EsportsGame[] | null {
  return cachedGames;
}

export function getCatalogMeta() {
  return cachedMeta;
}

/** Frontend overlay metadata pinned to the backend catalog version/hash. */
export function getCatalogSyncManifest() {
  return catalogSync;
}

export function getLocalAssetGames(): GameCatalogAssetGame[] {
  return assetsFile.games;
}

/** Offline fallback is intentionally empty — catalog data must come from the API. */
export function getLocalFallbackGames(): EsportsGame[] {
  return [];
}

export function getLocalLogo(slug: string): string {
  return assetBySlug.get(slug)?.logo ?? '';
}

function findModeOverlay(slug: string, modeKey: string): GameCatalogAssetModeOverlay | undefined {
  return assetBySlug.get(slug)?.modeOverlays?.find(
    (overlay) => overlay.modeKey.toLowerCase() === modeKey.toLowerCase(),
  );
}

function mapCatalogMode(slug: string, mode: CatalogGameApi['modes'][number]): GameMode {
  const overlay = findModeOverlay(slug, mode.modeKey);
  return {
    name: mode.name,
    key: mode.modeKey,
    value: mode.modeKey,
    teamSize: mode.teamSize,
    participantMode: mode.participantMode === 'solo' ? 'solo' : 'team',
    allowsSubstitutes: mode.allowsSubstitutes,
    maxRosterSize: mode.maxRosterSize ?? undefined,
    aliases: mode.aliases ?? [],
    modeGroup: mode.modeGroup ?? undefined,
    variantLabel: mode.variantLabel ?? undefined,
    mapPoolFilter: overlay?.mapPoolFilter,
    features: overlay?.features,
  };
}

export function catalogGameToEsportsGame(game: CatalogGameApi): EsportsGame {
  const asset = assetBySlug.get(game.slug);
  const modes = game.modes.map((mode) => mapCatalogMode(game.slug, mode));
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
    aliases: asset?.aliases ?? [],
    tournamentCapabilities: game.tournamentStructures.length
      ? {
          defaultStructure,
          supportedStructures: game.tournamentStructures.map((structure) => ({
            key: structure.structureKey,
            name: structure.name,
          })),
        }
      : undefined,
    logo: asset?.logo ?? '',
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
  return cachedGames;
}

export function clearGameCatalogCache(): void {
  cachedGames = null;
  cachedMeta = null;
}
