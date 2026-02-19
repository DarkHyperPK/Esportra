import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAWG_API_KEY = Deno.env.get("RAWG_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
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

        // Build the target RAWG API URL
        let targetUrl = "";

        if (endpoint === "screenshots" && game_id) {
            // Fetch screenshots for a specific game
            targetUrl = `https://api.rawg.io/api/games/${game_id}/screenshots?key=${RAWG_API_KEY}`;
        } else if (search) {
            // Search for games
            targetUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(search)}&page_size=${page_size}`;
        } else {
            return new Response(JSON.stringify({ error: "Invalid request. Provide 'search' or 'endpoint=screenshots&game_id=...'" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`[rawg-proxy] Fetching: ${targetUrl.replace(RAWG_API_KEY, "REDACTED")}`);

        const response = await fetch(targetUrl);
        const data = await response.json();

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
