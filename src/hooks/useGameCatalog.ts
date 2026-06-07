import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { GameCatalogApiResponse } from '@/types/gameCatalog';
import {
  getCatalogGames,
  getCatalogMeta,
  getCatalogSyncManifest,
  getLocalFallbackGames,
  getLocalFallbackMeta,
  readStoredCatalogSnapshot,
  setGameCatalogFromApi,
} from '@/utils/gameCatalogCache';
import type { EsportsGame } from '@/utils/gameFeatures';

export type GameCatalogData = {
  catalogVersion: string;
  schemaVersion: number;
  contentHash: string;
  games: EsportsGame[];
  source: 'api' | 'offline';
};

function offlineCatalogSnapshot(): GameCatalogData {
  const manifest = getCatalogSyncManifest();
  const fallbackMeta = getLocalFallbackMeta();
  const fallbackGames = getLocalFallbackGames();

  return {
    catalogVersion: fallbackMeta?.catalogVersion ?? manifest.catalogVersion,
    schemaVersion: fallbackMeta?.schemaVersion ?? manifest.schemaVersion,
    contentHash: fallbackMeta?.contentHash ?? manifest.contentHash,
    games: fallbackGames,
    source: 'offline',
  };
}

async function fetchGameCatalog(): Promise<GameCatalogData> {
  try {
    const response = await apiClient.get<GameCatalogApiResponse>('/api/games/catalog');
    const games = setGameCatalogFromApi(response);
    return {
      catalogVersion: response.catalogVersion,
      schemaVersion: response.schemaVersion,
      contentHash: response.contentHash,
      games,
      source: 'api',
    };
  } catch (error) {
    console.warn('[GameCatalog] API unavailable; using offline snapshot if present.', error);
    const offline = offlineCatalogSnapshot();
    if (offline.games.length) {
      const snapshot = readStoredCatalogSnapshot();
      if (snapshot) setGameCatalogFromApi(snapshot);
    }
    return offline;
  }
}

export function useGameCatalog() {
  return useQuery({
    queryKey: ['game-catalog'],
    queryFn: fetchGameCatalog,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: () => {
      const cached = getCatalogGames();
      const meta = getCatalogMeta();
      if (cached?.length && meta) {
        return {
          ...meta,
          games: cached,
          source: 'api' as const,
        };
      }

      const offline = offlineCatalogSnapshot();
      if (offline.games.length) return offline;
      return undefined;
    },
  });
}

export function getGameCatalogGames(fallbackOnEmpty = true): EsportsGame[] {
  const cached = getCatalogGames();
  if (cached?.length) return cached;
  if (!fallbackOnEmpty) return [];
  return getLocalFallbackGames();
}
