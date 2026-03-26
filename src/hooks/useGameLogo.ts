import { useState, useEffect } from 'react';
import { rawgSearchGames } from '@/lib/rawgProxy';
import esportsGames from '@/data/esportsGames.json';

// Cache for game logos to avoid redundant API calls
const logoCache: Record<string, string | null> = {};

/** Get the Twitch CDN logo from esportsGames.json as fallback */
function getStaticLogo(gameName: string): string | null {
    const game = (esportsGames.games as any[]).find(
        g => g.name.toLowerCase() === gameName.trim().toLowerCase()
            || g.slug === gameName.trim().toLowerCase()
    );
    return game?.logo ?? null;
}

/**
 * Global hook for fetching game logos from RAWG API (via Edge Function proxy)
 * @param gameName - The name of the game to fetch logo for
 * @returns The logo URL or null if not found/failed
 */
export const useGameLogo = (gameName: string | null | undefined): string | null => {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!gameName) {
      setLogo(null);
      return;
    }

    // Check cache first
    const cached = logoCache[gameName.toLowerCase()];
    if (cached !== undefined) {
      setLogo(cached);
      return;
    }

    // Fetch from RAWG API via proxy
    const fetchLogo = async () => {
      try {
        const searchName = gameName.trim().toLowerCase() === 'cs2'
          ? 'Counter-Strike 2'
          : gameName;

        const raw = await rawgSearchGames(searchName, 1);
        const data = raw?.data ?? raw;

        if (data?.results && data.results.length > 0) {
          const logoUrl = data.results[0].background_image || null;
          logoCache[gameName.toLowerCase()] = logoUrl;
          setLogo(logoUrl);
        } else {
          const fallback = getStaticLogo(gameName);
          logoCache[gameName.toLowerCase()] = fallback;
          setLogo(fallback);
        }
      } catch (error) {
        console.warn(`[useGameLogo] Failed to fetch logo for ${gameName}:`, error);
        const fallback = getStaticLogo(gameName);
        logoCache[gameName.toLowerCase()] = fallback;
        setLogo(fallback);
      }
    };

    fetchLogo();
  }, [gameName]);

  return logo;
};

/**
 * Hook for fetching multiple game logos at once
 * @param gameNames - Array of game names to fetch logos for
 * @returns Record mapping game names to their logo URLs
 */
export const useGameLogos = (gameNames: (string | null | undefined)[]): Record<string, string | null> => {
  const [logos, setLogos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const uniqueGames = Array.from(new Set(
      gameNames.filter(Boolean) as string[]
    ));

    const fetchLogos = async () => {
      const newLogos: Record<string, string | null> = {};

      await Promise.all(
        uniqueGames.map(async (gameName) => {
          // Check cache first
          const cached = logoCache[gameName.toLowerCase()];
          if (cached !== undefined) {
            newLogos[gameName] = cached;
            return;
          }

          try {
            const searchName = gameName.trim().toLowerCase() === 'cs2'
              ? 'Counter-Strike 2'
              : gameName;

            const raw = await rawgSearchGames(searchName, 1);
            const data = raw?.data ?? raw;

            if (data?.results && data.results.length > 0) {
              const logoUrl = data.results[0].background_image || null;
              logoCache[gameName.toLowerCase()] = logoUrl;
              newLogos[gameName] = logoUrl;
            } else {
              const fallback = getStaticLogo(gameName);
              logoCache[gameName.toLowerCase()] = fallback;
              newLogos[gameName] = fallback;
            }
          } catch (error) {
            console.warn(`[useGameLogos] Failed to fetch logo for ${gameName}:`, error);
            const fallback = getStaticLogo(gameName);
            logoCache[gameName.toLowerCase()] = fallback;
            newLogos[gameName] = fallback;
          }
        })
      );

      setLogos(newLogos);
    };

    if (uniqueGames.length > 0) {
      fetchLogos();
    } else {
      setLogos({});
    }
  }, [gameNames.join(',')]); // Use join to create stable dependency

  return logos;
};

/**
 * Utility function to clear the logo cache (useful for testing or forced refresh)
 */
export const clearGameLogoCache = () => {
  Object.keys(logoCache).forEach(key => delete logoCache[key]);
};
