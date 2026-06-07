import { useState, useEffect } from 'react';
import { fetchGameData } from '@/hooks/useRawgGame';

/**
 * Global hook for fetching game logos — backed by the shared RAWG cache.
 */
export const useGameLogo = (gameName: string | null | undefined): string | null => {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!gameName) {
      setLogo(null);
      return;
    }

    let isMounted = true;
    fetchGameData(gameName).then(cached => {
      if (isMounted) setLogo(cached.gameLogo);
    });
    return () => { isMounted = false; };
  }, [gameName]);

  return logo;
};

/**
 * Hook for fetching multiple game logos at once — backed by the shared RAWG cache.
 */
export const useGameLogos = (gameNames: (string | null | undefined)[]): Record<string, string | null> => {
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const gameNamesKey = gameNames.join(',');

  useEffect(() => {
    const uniqueGames = Array.from(new Set(
      gameNames.filter(Boolean) as string[]
    ));

    if (uniqueGames.length === 0) {
      setLogos({});
      return;
    }

    let isMounted = true;
    Promise.all(
      uniqueGames.map(async (name) => {
        const cached = await fetchGameData(name);
        return [name, cached.gameLogo] as const;
      })
    ).then(results => {
      if (isMounted) {
        const newLogos: Record<string, string | null> = {};
        results.forEach(([name, url]) => { newLogos[name] = url; });
        setLogos(newLogos);
      }
    });

    return () => { isMounted = false; };
  }, [gameNames, gameNamesKey]);

  return logos;
};

/**
 * Utility function to clear the logo cache (useful for testing or forced refresh)
 */
export const clearGameLogoCache = () => {
  // Cache is managed centrally in useRawgGame.ts now
};
