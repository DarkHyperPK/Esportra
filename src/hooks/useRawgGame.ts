import { useState, useEffect, useRef } from 'react';
import { rawgSearchGames, rawgGetScreenshots } from '@/lib/rawgProxy';
import esportsGames from '@/data/esportsGames.json';

interface RawgGameData {
    gameLogo: string | null;
    gameBanner: string | null;
    screenshots: string[];
    carouselIndex: number;
    isLoading: boolean;
    error: string | null;
}

// Persistent cache: localStorage + in-memory for instant loads
export interface CachedGame {
    gameLogo: string | null;
    gameBanner: string | null;
    screenshots: string[];
}

const CACHE_KEY = 'rawg_game_cache';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function loadPersistedCache(): Map<string, CachedGame> {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return new Map();
        const parsed = JSON.parse(raw) as { ts: number; data: Record<string, CachedGame> };
        if (Date.now() - parsed.ts > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return new Map();
        }
        return new Map(Object.entries(parsed.data));
    } catch {
        return new Map();
    }
}

function persistCache() {
    try {
        const obj: Record<string, CachedGame> = {};
        gameCache.forEach((v, k) => { obj[k] = v; });
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: obj }));
    } catch { /* quota exceeded — non-critical */ }
}

const gameCache = loadPersistedCache();
const pendingFetches = new Map<string, Promise<CachedGame>>();

/** Get the Twitch CDN logo from esportsGames.json as fallback */
function getTwitchFallback(gameName: string): string | null {
    const game = (esportsGames.games as any[]).find(
        g => g.name.toLowerCase() === gameName.trim().toLowerCase()
            || g.slug === gameName.trim().toLowerCase()
    );
    return game?.logo ?? null;
}

function getRawgGameName(name: string) {
    const normalized = name.trim().toLowerCase();
    if (normalized === 'cs2' || normalized === 'counter strike 2' || normalized === 'counter-strike 2') {
        return 'Counter-Strike 2';
    }
    return name;
}

export async function fetchGameData(gameName: string): Promise<CachedGame> {
    const cacheKey = gameName.trim().toLowerCase();

    // Return cached result
    if (gameCache.has(cacheKey)) return gameCache.get(cacheKey)!;

    // Deduplicate in-flight requests for the same game
    if (pendingFetches.has(cacheKey)) return pendingFetches.get(cacheKey)!;

    const promise = (async (): Promise<CachedGame> => {
        try {
            const searchName = getRawgGameName(gameName);
            const raw = await rawgSearchGames(searchName);
            const result = raw?.data ?? raw;

            if (result?.results?.length > 0) {
                const gameData = result.results[0];
                const logo = gameData.background_image || null;

                try {
                    const screenshotsData = await rawgGetScreenshots(gameData.id);
                    const screenshotUrls = (screenshotsData.results || []).map((s: any) => s.image);
                    const cached: CachedGame = {
                        gameLogo: logo,
                        gameBanner: screenshotUrls[0] || logo,
                        screenshots: screenshotUrls.length > 0 ? screenshotUrls : [gameData.background_image_additional, logo].filter(Boolean),
                    };
                    gameCache.set(cacheKey, cached);
                    persistCache();
                    return cached;
                } catch {
                    const cached: CachedGame = {
                        gameLogo: logo,
                        gameBanner: gameData.background_image_additional || logo,
                        screenshots: [gameData.background_image_additional, logo].filter(Boolean),
                    };
                    gameCache.set(cacheKey, cached);
                    persistCache();
                    return cached;
                }
            }

            const fallback = getTwitchFallback(gameName);
            const cached: CachedGame = {
                gameLogo: fallback,
                gameBanner: fallback,
                screenshots: fallback ? [fallback] : [],
            };
            gameCache.set(cacheKey, cached);
            persistCache();
            return cached;
        } catch {
            const fallback = getTwitchFallback(gameName);
            const cached: CachedGame = {
                gameLogo: fallback,
                gameBanner: fallback,
                screenshots: fallback ? [fallback] : [],
            };
            gameCache.set(cacheKey, cached);
            persistCache();
            return cached;
        } finally {
            pendingFetches.delete(cacheKey);
        }
    })();

    pendingFetches.set(cacheKey, promise);
    return promise;
}

export const useRawgGame = (gameName: string) => {
    // Synchronous cache hit — no loading flash on revisit
    const cacheKey = gameName.trim().toLowerCase();
    const cached = gameCache.get(cacheKey);

    const [data, setData] = useState<RawgGameData>(() => cached ? {
        ...cached,
        carouselIndex: 0,
        isLoading: false,
        error: null,
    } : {
        gameLogo: null,
        gameBanner: null,
        screenshots: [],
        carouselIndex: 0,
        isLoading: true,
        error: null,
    });

    const carouselTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Skip fetch if we already had a cache hit
        if (gameCache.has(cacheKey)) return;

        let isMounted = true;

        fetchGameData(gameName).then(result => {
            if (isMounted) {
                setData({
                    ...result,
                    carouselIndex: 0,
                    isLoading: false,
                    error: result.screenshots.length === 0 ? 'No results found' : null,
                });
            }
        });

        return () => { isMounted = false; };
    }, [gameName, cacheKey]);

    useEffect(() => {
        if (data.screenshots.length <= 1) return;

        if (carouselTimeout.current) clearTimeout(carouselTimeout.current);

        carouselTimeout.current = setTimeout(() => {
            setData(prev => ({
                ...prev,
                carouselIndex: (prev.carouselIndex + 1) % prev.screenshots.length
            }));
        }, 6000); // Slower carousel — reduces re-renders

        return () => {
            if (carouselTimeout.current) clearTimeout(carouselTimeout.current);
        };
    }, [data.carouselIndex, data.screenshots.length]);

    return data;
};
