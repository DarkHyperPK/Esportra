import { useState, useEffect, useRef } from 'react';
import { rawgSearchGames, rawgGetScreenshots } from '@/lib/rawgProxy';

interface RawgGameData {
    gameLogo: string | null;
    gameBanner: string | null;
    screenshots: string[];
    carouselIndex: number;
    isLoading: boolean;
    error: string | null;
}

export const useRawgGame = (gameName: string) => {
    const [data, setData] = useState<RawgGameData>({
        gameLogo: null,
        gameBanner: null,
        screenshots: [],
        carouselIndex: 0,
        isLoading: true,
        error: null,
    });

    const carouselTimeout = useRef<NodeJS.Timeout | null>(null);

    const getRawgGameName = (name: string) => {
        const normalized = name.trim().toLowerCase();
        if (normalized === 'cs2' || normalized === 'counter strike 2' || normalized === 'counter-strike 2') {
            return 'Counter-Strike 2';
        }
        return name;
    };

    useEffect(() => {
        let isMounted = true;
        const fetchGameImages = async () => {
            try {
                setData(prev => ({ ...prev, isLoading: true, error: null }));
                const searchName = getRawgGameName(gameName);
                const result = await rawgSearchGames(searchName);

                if (result && result.results && result.results.length > 0) {
                    const gameData = result.results[0];
                    const logo = gameData.background_image || null;

                    try {
                        const screenshotsData = await rawgGetScreenshots(gameData.id);

                        if (isMounted) {
                            const screenshotUrls = (screenshotsData.results || []).map((s: any) => s.image);
                            setData({
                                gameLogo: logo,
                                gameBanner: screenshotUrls[0] || logo,
                                screenshots: screenshotUrls.length > 0 ? screenshotUrls : [gameData.background_image_additional, logo].filter(Boolean),
                                carouselIndex: 0,
                                isLoading: false,
                                error: null,
                            });
                        }
                    } catch (err) {
                        if (isMounted) {
                            setData({
                                gameLogo: logo,
                                gameBanner: gameData.background_image_additional || logo,
                                screenshots: [gameData.background_image_additional, logo].filter(Boolean),
                                carouselIndex: 0,
                                isLoading: false,
                                error: null,
                            });
                        }
                    }
                } else if (isMounted) {
                    setData(prev => ({ ...prev, isLoading: false, error: 'No results found' }));
                }
            } catch (err) {
                if (isMounted) {
                    setData(prev => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' }));
                }
            }
        };

        fetchGameImages();
        return () => { isMounted = false; };
    }, [gameName]);

    useEffect(() => {
        if (data.screenshots.length <= 1) return;

        if (carouselTimeout.current) clearTimeout(carouselTimeout.current);

        carouselTimeout.current = setTimeout(() => {
            setData(prev => ({
                ...prev,
                carouselIndex: (prev.carouselIndex + 1) % prev.screenshots.length
            }));
        }, 4000);

        return () => {
            if (carouselTimeout.current) clearTimeout(carouselTimeout.current);
        };
    }, [data.carouselIndex, data.screenshots.length]);

    return data;
};
