import { useState, useEffect, useCallback } from 'react';

const RAWG_API_KEY = '55e8210bf73448108b7f3c6707739206';
const RAWG_API_URL = 'https://api.rawg.io/api/games';

// Cache for game logos to avoid redundant API calls
const logoCache: Record<string, string | null> = {};

/**
 * Global hook for fetching game logos from RAWG API
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

    // Fetch from RAWG API
    const fetchLogo = async () => {
      try {
        const searchName = gameName.trim().toLowerCase() === 'cs2' 
          ? 'Counter-Strike 2' 
          : gameName;
        
        const response = await fetch(
          `${RAWG_API_URL}?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchName)}&page_size=1`
        );
        const data = await response.json();
        
        if (data?.results && data.results.length > 0) {
          const logoUrl = data.results[0].background_image || null;
          // Cache the result
          logoCache[gameName.toLowerCase()] = logoUrl;
          setLogo(logoUrl);
        } else {
          // Cache null result to avoid retrying
          logoCache[gameName.toLowerCase()] = null;
          setLogo(null);
        }
      } catch (error) {
        console.error(`Failed to fetch game logo for ${gameName}:`, error);
        // Cache null result on error
        logoCache[gameName.toLowerCase()] = null;
        setLogo(null);
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

          // Fetch from RAWG API
          try {
            const searchName = gameName.trim().toLowerCase() === 'cs2' 
              ? 'Counter-Strike 2' 
              : gameName;
            
            const response = await fetch(
              `${RAWG_API_URL}?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchName)}&page_size=1`
            );
            const data = await response.json();
            
            if (data?.results && data.results.length > 0) {
              const logoUrl = data.results[0].background_image || null;
              logoCache[gameName.toLowerCase()] = logoUrl;
              newLogos[gameName] = logoUrl;
            } else {
              logoCache[gameName.toLowerCase()] = null;
              newLogos[gameName] = null;
            }
          } catch (error) {
            console.error(`Failed to fetch logo for ${gameName}:`, error);
            logoCache[gameName.toLowerCase()] = null;
            newLogos[gameName] = null;
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

