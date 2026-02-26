import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const RAWG_API_KEY = Deno.env.get("RAWG_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "");

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Authenticate Request
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const url_obj = new URL(req.url);
        const searchParams = url_obj.searchParams;

        const search = searchParams.get("search");
        const endpoint = searchParams.get("endpoint");
        const game_id = searchParams.get("game_id");
        const page_size = searchParams.get("page_size") || "20";

        if (!RAWG_API_KEY) {
            console.error("[rawg-proxy] RAWG_API_KEY not found in environment");
            return new Response(JSON.stringify({ error: "RAWG API Key not configured on server" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Check Cache for Search Requests
        if (search && !endpoint) {
            const { data: cachedGame } = await supabase
                .from('games_metadata')
                .select('*')
                .ilike('game_name', search.trim())
                .gt('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .single();

            if (cachedGame) {
                console.log(`[rawg-proxy] Cache Hit: ${search}`);
                return new Response(JSON.stringify({
                    results: [{
                        id: cachedGame.rawg_id,
                        name: cachedGame.game_name,
                        background_image: cachedGame.background_image,
                        background_image_additional: cachedGame.banner_image,
                        is_cached: true
                    }]
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // 2. Build the target RAWG API URL
        let targetUrl = "";
        if (endpoint === "screenshots" && game_id) {
            targetUrl = `https://api.rawg.io/api/games/${game_id}/screenshots?key=${RAWG_API_KEY}`;
        } else if (search) {
            targetUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(search)}&page_size=${page_size}`;
        } else {
            return new Response(JSON.stringify({ error: "Invalid request" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`[rawg-proxy] Cache Miss - Fetching: ${search || game_id}`);
        const response = await fetch(targetUrl);
        const data = await response.json();

        // 3. Update Cache for Search Results
        if (search && !endpoint && data.results && data.results.length > 0) {
            const game = data.results[0];
            await supabase.from('games_metadata').upsert({
                game_name: search.trim(),
                rawg_id: game.id,
                background_image: game.background_image,
                banner_image: game.background_image_additional,
                last_updated: new Date().toISOString()
            }, { onConflict: 'game_name' });
        }

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("[rawg-proxy] Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
