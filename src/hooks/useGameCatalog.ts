import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { GameCatalogApiResponse } from '@/types/gameCatalog';
import {
  getCatalogGames,
  getCatalogMeta,
  getCatalogSyncManifest,
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
  return {
    catalogVersion: manifest.catalogVersion,
    schemaVersion: manifest.schemaVersion,
    contentHash: manifest.contentHash,
    games: [],
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
    console.warn('[GameCatalog] API unavailable; catalog data requires backend.', error);
    return offlineCatalogSnapshot();
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
      if (!cached?.length || !meta) return undefined;
      return {
        ...meta,
        games: cached,
        source: 'api' as const,
      };
    },
  });
}

export function getGameCatalogGames(fallbackOnEmpty = true): EsportsGame[] {
  const cached = getCatalogGames();
  if (cached?.length) return cached;
  return fallbackOnEmpty ? [] : [];
}
