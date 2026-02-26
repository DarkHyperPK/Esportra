/**
 * RAWG API Proxy
 * Routes all RAWG API calls through a Supabase Edge Function to avoid CORS issues.
 * The API key lives server-side only.
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://api.esportra.com';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/rawg-proxy`;

/**
 * Search for games on RAWG via the proxy
 */
export async function rawgSearchGames(searchName: string, pageSize = 1): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(
        `${PROXY_URL}?search=${encodeURIComponent(searchName)}&page_size=${pageSize}`,
        {
            headers: {
                apikey: ANON_KEY,
                Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
            },
        }
    );
    if (!res.ok) throw new Error(`RAWG proxy error: ${res.status}`);
    return res.json();
}

/**
 * Fetch screenshots for a specific game ID via the proxy
 */
export async function rawgGetScreenshots(gameId: number): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(
        `${PROXY_URL}?endpoint=screenshots&game_id=${gameId}`,
        {
            headers: {
                apikey: ANON_KEY,
                Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
            },
        }
    );
    if (!res.ok) throw new Error(`RAWG proxy error: ${res.status}`);
    return res.json();
}
