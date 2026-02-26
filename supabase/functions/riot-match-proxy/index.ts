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
        // ── SECURITY: Require valid JWT ──
        const authHeader = req.headers.get('Authorization') || '';
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Authentication required" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        ).auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

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

        // ── SECURITY: Validate endpoint path against allowlist ──
        const ALLOWED_ENDPOINT_PATTERNS = [
            /^\/riot\/account\/v1\/accounts\//,
            /^\/val\/match\/v1\/matches\//,
            /^\/val\/match\/v1\/matchlists\//,
            /^\/val\/content\/v1\/contents/,
            /^\/val\/ranked\/v1\/leaderboards/,
        ];

        const isAllowedEndpoint = ALLOWED_ENDPOINT_PATTERNS.some(pattern => pattern.test(endpoint));
        if (!isAllowedEndpoint) {
            console.error(`[riot-proxy] Blocked disallowed endpoint: ${endpoint}`);
            return new Response(JSON.stringify({ error: "Endpoint not allowed" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Build the full URL
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
