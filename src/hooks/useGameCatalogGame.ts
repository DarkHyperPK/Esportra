import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import {
  parseCatalogBrConfig,
  type GameCatalogGameResponse,
} from '@/utils/gameCatalogBr';

export function useGameCatalogGame(gameName?: string | null) {
  const normalized = gameName?.trim() ?? '';

  return useQuery({
    queryKey: ['game-catalog-game', normalized.toLowerCase()],
    queryFn: async () => {
      const response = await apiClient.get<GameCatalogGameResponse>(
        `/api/games/catalog/${encodeURIComponent(normalized)}`,
      );
      return {
        ...response,
        brConfig: parseCatalogBrConfig(response.brConfig),
      };
    },
    enabled: normalized.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
