import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RIOT_API_KEY = Deno.env.get("RIOT_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { endpoint, region } = await req.json();

        if (!endpoint) {
            return new Response(JSON.stringify({ error: "Endpoint is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!RIOT_API_KEY) {
            return new Response(JSON.stringify({ error: "Riot API Key not configured on server" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Build the full URL
        // region can be 'asia', 'americas', 'europe', 'esports' for Account/Match V5
        // or 'ap1', 'br1', 'euw1', etc for VAL-CONTENT / VAL-MATCH
        const baseUrl = `https://${region || "asia"}.api.riotgames.com`;
        const url = `${baseUrl}${endpoint}`;

        console.log(`[riot-proxy] Fetching: ${url}`);

        const response = await fetch(url, {
            headers: {
                "X-Riot-Token": RIOT_API_KEY,
            },
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
