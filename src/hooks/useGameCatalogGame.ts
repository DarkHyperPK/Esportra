import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { getGameByName } from '@/utils/gameFeatures';
import { getCatalogGames } from '@/utils/gameCatalogCache';
import {
  parseCatalogBrConfig,
  type GameCatalogGameResponse,
} from '@/utils/gameCatalogBr';

function gameToCatalogResponse(game: NonNullable<ReturnType<typeof getGameByName>>): GameCatalogGameResponse & { brConfig: ReturnType<typeof parseCatalogBrConfig> } {
  const modes = (game.modes ?? game.formats).map((mode) => ({
    modeKey: mode.key || mode.value,
    name: mode.name,
    teamSize: mode.teamSize,
    participantMode: mode.participantMode ?? 'team',
    allowsSubstitutes: mode.allowsSubstitutes ?? false,
    maxRosterSize: mode.maxRosterSize ?? null,
    aliases: mode.aliases ?? [],
    modeGroup: mode.modeGroup ?? null,
    variantLabel: mode.variantLabel ?? null,
  }));

  const tournamentStructures = (game.tournamentCapabilities?.supportedStructures ?? []).map((structure, index) => ({
    structureKey: structure.key,
    name: structure.name,
    isDefault: structure.key === game.tournamentCapabilities?.defaultStructure || index === 0,
  }));

  return {
    slug: game.slug,
    name: game.name,
    category: game.category,
    gameType: game.type,
    defaultModeKey: game.defaultMode ?? game.defaultFormat,
    features: game.features as Record<string, unknown>,
    brConfig: parseCatalogBrConfig(game.brConfig),
    modes,
    tournamentStructures,
  };
}

export function useGameCatalogGame(gameName?: string | null) {
  const normalized = gameName?.trim() ?? '';

  return useQuery({
    queryKey: ['game-catalog-game', normalized.toLowerCase()],
    queryFn: async () => {
      const cachedGame = getCatalogGames()?.length ? getGameByName(normalized) : undefined;
      if (cachedGame) {
        return gameToCatalogResponse(cachedGame);
      }

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
