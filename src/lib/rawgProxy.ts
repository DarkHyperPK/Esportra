/**
 * RAWG API Proxy
 * Routes all RAWG API calls through a Supabase Edge Function to avoid CORS issues.
 * The API key lives server-side only.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://api.esportra.com';
const PROXY_URL = `${SUPABASE_URL}/functions/v1/rawg-proxy`;

/**
 * Search for games on RAWG via the proxy
 */
export async function rawgSearchGames(searchName: string, pageSize = 1): Promise<any> {
    const res = await fetch(
        `${PROXY_URL}?search=${encodeURIComponent(searchName)}&page_size=${pageSize}`
    );
    if (!res.ok) throw new Error(`RAWG proxy error: ${res.status}`);
    return res.json();
}

/**
 * Fetch screenshots for a specific game ID via the proxy
 */
export async function rawgGetScreenshots(gameId: number): Promise<any> {
    const res = await fetch(
        `${PROXY_URL}?endpoint=screenshots&game_id=${gameId}`
    );
    if (!res.ok) throw new Error(`RAWG proxy error: ${res.status}`);
    return res.json();
}
