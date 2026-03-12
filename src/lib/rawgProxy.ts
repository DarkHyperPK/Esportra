/**
 * RAWG API Proxy
 * Routes all RAWG API calls through the backend API to avoid CORS issues.
 * The API key lives server-side only.
 */

import { apiClient } from "@/lib/apiClient";

/**
 * Search for games on RAWG via the backend proxy
 */
export async function rawgSearchGames(searchName: string, pageSize = 1): Promise<any> {
    return apiClient.get(`/api/games/search?q=${encodeURIComponent(searchName)}`);
}

/**
 * Fetch screenshots for a specific game ID via the backend proxy
 */
export async function rawgGetScreenshots(gameId: number): Promise<any> {
    return apiClient.get(`/api/games/${gameId}/screenshots`);
}
