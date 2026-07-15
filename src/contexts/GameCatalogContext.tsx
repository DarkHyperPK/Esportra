import React, { useMemo } from 'react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { GameCatalogContext, type GameCatalogContextValue } from '@/contexts/game-catalog-context';

export function GameCatalogProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError, isFetched } = useGameCatalog();

  const value = useMemo<GameCatalogContextValue>(() => {
    const hasGames = Boolean(data?.games?.length);
    const isUnavailable = isFetched && !isLoading && !hasGames;

    return {
      games: data?.games ?? [],
      isReady: isFetched && !isLoading && hasGames,
      isLoading,
      isError: isError || isUnavailable,
      isUnavailable,
      catalogVersion: data?.catalogVersion,
      source: data?.source,
    };
  }, [data, isLoading, isError, isFetched]);

  return (
    <GameCatalogContext.Provider value={value}>
      {children}
    </GameCatalogContext.Provider>
  );
}
