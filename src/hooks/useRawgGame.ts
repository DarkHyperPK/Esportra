import { useState, useEffect, useRef } from 'react';
import { rawgSearchGames, rawgGetScreenshots } from '@/lib/rawgProxy';
import { apiClient } from '@/lib/apiClient';
import esportsGames from '@/data/esportsGames.json';

interface IgdbVideo {
    videoId: string;
    name: string | null;
}

interface GameData {
    gameLogo: string | null;
    gameBanner: string | null;       // IGDB primary banner (for public page)
    screenshots: string[];            // IGDB banners (for public page carousel)
    rawgScreenshots: string[];        // RAWG screenshots (for card carousel)
    videos: IgdbVideo[];
    carouselIndex: number;
    isLoading: boolean;
    error: string | null;
}

// Persistent cache: localStorage + in-memory for instant loads
export interface CachedGame {
    gameLogo: string | null;
    gameBanner: string | null;
    cover: string | null;            // IGDB official cover art
    screenshots: string[];           // IGDB banners
    rawgScreenshots: string[];       // RAWG screenshots
    videos: IgdbVideo[];
}

const CACHE_KEY = 'game_assets_cache_v4';
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

interface IgdbAssetsResponse {
    banners: string[];
    cover: string | null;
    videos: IgdbVideo[];
}

export async function fetchGameData(gameName: string): Promise<CachedGame> {
    const cacheKey = gameName.trim().toLowerCase();

    // Return cached result
    if (gameCache.has(cacheKey)) return gameCache.get(cacheKey)!;

    // Deduplicate in-flight requests for the same game
    if (pendingFetches.has(cacheKey)) return pendingFetches.get(cacheKey)!;

    const promise = (async (): Promise<CachedGame> => {
        try {
            // Fetch IGDB assets and RAWG search in parallel
            const [igdbResult, rawgResult] = await Promise.allSettled([
                apiClient.get<IgdbAssetsResponse>(
                    `/api/games/igdb-assets?game=${encodeURIComponent(gameName)}`
                ),
                (async () => {
                    const searchName = getRawgGameName(gameName);
                    const raw = await rawgSearchGames(searchName);
                    const result = raw?.data ?? raw;
                    if (!result?.results?.length) return null;
                    const game = result.results[0];
                    // Fetch RAWG screenshots for card carousel
                    let ssImages: string[] = [];
                    if (game.id) {
                        try {
                            const ssRaw = await rawgGetScreenshots(game.id);
                            const ssResult = ssRaw?.data ?? ssRaw;
                            ssImages = (ssResult?.results || [])
                                .map((s: any) => s.image as string)
                                .filter(Boolean)
                                .slice(0, 8);
                        } catch { /* non-critical */ }
                    }
                    return {
                        logo: game.background_image as string | null,
                        screenshots: ssImages.length > 0 ? ssImages : (game.background_image ? [game.background_image] : []),
                    };
                })()
            ]);

            const igdb = igdbResult.status === 'fulfilled' ? igdbResult.value : null;
            const rawg = rawgResult.status === 'fulfilled' ? rawgResult.value : null;

            const igdbBanners = igdb?.banners || [];
            const igdbCover = igdb?.cover || null;
            const igdbVideos = igdb?.videos || [];
            const rawgLogo = rawg?.logo || null;
            const rawgScreenshots = rawg?.screenshots || [];
            const twitchFallback = getTwitchFallback(gameName);

            const cached: CachedGame = {
                gameLogo: rawgLogo || twitchFallback,
                gameBanner: igdbBanners[0] || rawgLogo || twitchFallback,
                cover: igdbCover,
                screenshots: igdbBanners.length > 0
                    ? igdbBanners
                    : [rawgLogo].filter(Boolean) as string[],
                rawgScreenshots: rawgScreenshots.length > 0
                    ? rawgScreenshots
                    : [rawgLogo].filter(Boolean) as string[],
                videos: igdbVideos,
            };
            gameCache.set(cacheKey, cached);
            persistCache();
            return cached;
        } catch {
            const fallback = getTwitchFallback(gameName);
            const cached: CachedGame = {
                gameLogo: fallback,
                gameBanner: fallback,
                cover: null,
                screenshots: fallback ? [fallback] : [],
                rawgScreenshots: fallback ? [fallback] : [],
                videos: [],
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

    const [data, setData] = useState<GameData>(() => cached ? {
        ...cached,
        carouselIndex: 0,
        isLoading: false,
        error: null,
    } : {
        gameLogo: null,
        gameBanner: null,
        screenshots: [],
        rawgScreenshots: [],
        videos: [],
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
                    error: (result.screenshots.length === 0 && result.rawgScreenshots.length === 0) ? 'No results found' : null,
                });
            }
        });

        return () => { isMounted = false; };
    }, [gameName, cacheKey]);

    const maxLen = Math.max(data.screenshots?.length || 0, data.rawgScreenshots?.length || 0);

    useEffect(() => {
        if (maxLen <= 1) return;

        if (carouselTimeout.current) clearTimeout(carouselTimeout.current);

        carouselTimeout.current = setTimeout(() => {
            setData(prev => ({
                ...prev,
                carouselIndex: (prev.carouselIndex + 1) % maxLen
            }));
        }, 6000);

        return () => {
            if (carouselTimeout.current) clearTimeout(carouselTimeout.current);
        };
    }, [data.carouselIndex, maxLen]);

    return data;
};
