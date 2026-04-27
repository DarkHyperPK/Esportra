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

interface FetchGameDataOptions {
    /** Skip RAWG search + screenshot calls (saves 2 API calls per game) */
    skipRawg?: boolean;
}

interface UseRawgGameOptions extends FetchGameDataOptions {
    enabled?: boolean;
}

export async function fetchGameData(
    gameName: string,
    options?: FetchGameDataOptions,
): Promise<CachedGame> {
    const cacheKey = gameName.trim().toLowerCase();
    const skipRawg = options?.skipRawg ?? false;

    // Return cached result (but only if it has RAWG data, or caller doesn't need it)
    const cached = gameCache.get(cacheKey);
    if (cached && (skipRawg || cached.rawgScreenshots.length > 0)) {
        return cached;
    }

    // Deduplicate in-flight requests for the same game
    const pendingKey = `${cacheKey}:${skipRawg ? 'igdb' : 'full'}`;
    if (pendingFetches.has(pendingKey)) return pendingFetches.get(pendingKey)!;

    const promise = (async (): Promise<CachedGame> => {
        try {
            const igdbPromise = apiClient.get<IgdbAssetsResponse>(
                `/api/games/igdb-assets?game=${encodeURIComponent(gameName)}`
            );

            const rawgPromise = skipRawg
                ? Promise.resolve(null)
                : (async () => {
                    const searchName = getRawgGameName(gameName);
                    const raw = await rawgSearchGames(searchName);
                    const result = raw?.data ?? raw;
                    if (!result?.results?.length) return null;
                    const game = result.results[0];
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
                })();

            const [igdbResult, rawgResult] = await Promise.allSettled([igdbPromise, rawgPromise]);

            const igdb = igdbResult.status === 'fulfilled' ? igdbResult.value : null;
            const rawg = rawgResult.status === 'fulfilled' ? rawgResult.value : null;

            const igdbBanners = igdb?.banners || [];
            const igdbCover = igdb?.cover || null;
            const igdbVideos = igdb?.videos || [];
            const rawgLogo = rawg?.logo || null;
            const rawgScreenshots = rawg?.screenshots || [];
            const twitchFallback = getTwitchFallback(gameName);

            const result: CachedGame = {
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
            gameCache.set(cacheKey, result);
            persistCache();
            return result;
        } catch {
            const fallback = getTwitchFallback(gameName);
            const result: CachedGame = {
                gameLogo: fallback,
                gameBanner: fallback,
                cover: null,
                screenshots: fallback ? [fallback] : [],
                rawgScreenshots: fallback ? [fallback] : [],
                videos: [],
            };
            gameCache.set(cacheKey, result);
            persistCache();
            return result;
        } finally {
            pendingFetches.delete(pendingKey);
        }
    })();

    pendingFetches.set(pendingKey, promise);
    return promise;
}

export const useRawgGame = (gameName: string, options?: UseRawgGameOptions) => {
    const enabled = options?.enabled ?? true;
    const skipRawg = options?.skipRawg ?? false;
    // Synchronous cache hit — no loading flash on revisit
    const cacheKey = gameName.trim().toLowerCase();
    const cached = enabled ? gameCache.get(cacheKey) : undefined;

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
        isLoading: enabled,
        error: null,
    });

    const carouselTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled || !gameName.trim()) {
            setData((prev) => ({
                ...prev,
                isLoading: false,
            }));
            return;
        }

        // Skip fetch if we already had a cache hit
        if (gameCache.has(cacheKey)) return;

        let isMounted = true;

        fetchGameData(gameName, { skipRawg }).then(result => {
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
    }, [gameName, cacheKey, enabled, skipRawg]);

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
