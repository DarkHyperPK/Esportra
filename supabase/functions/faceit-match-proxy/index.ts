import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FACEIT_API_KEY = Deno.env.get("FACEIT_API_KEY")!;
const FACEIT_BASE_URL = "https://open.faceit.com/data/v4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowlist — matched against the PATH only (query string stripped before check)
const ALLOWED_PATH_PATTERNS = [
    /^\/players$/,                                  // player lookup by nickname (?nickname=)
    /^\/players\/[^/]+$/,                           // player profile by ID
    /^\/players\/[^/]+\/history$/,                  // match history (?game=cs2&limit=N)
    /^\/players\/[^/]+\/games\/[^/]+\/stats$/,      // player lifetime stats for a game
    /^\/matches\/[^/]+$/,                           // match details
    /^\/matches\/[^/]+\/stats$/,                    // match round stats
    /^\/games$/,                                    // list all games
    /^\/games\/[^/]+$/,                             // specific game info
];

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Require valid Supabase JWT
        const authHeader = req.headers.get("Authorization") || "";
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Authentication required" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!FACEIT_API_KEY) {
            return new Response(JSON.stringify({ error: "FACEIT_API_KEY not configured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { endpoint } = await req.json();
        if (!endpoint) {
            return new Response(JSON.stringify({ error: "endpoint is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Check path only (strip query string) against the allowlist
        const pathOnly = endpoint.split("?")[0];
        const isAllowed = ALLOWED_PATH_PATTERNS.some(p => p.test(pathOnly));
        if (!isAllowed) {
            console.error(`[faceit-proxy] Blocked endpoint: ${endpoint}`);
            return new Response(JSON.stringify({ error: "Endpoint not allowed" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const url = `${FACEIT_BASE_URL}${endpoint}`;
        console.log(`[faceit-proxy] Fetching: ${url}`);

        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${FACEIT_API_KEY}` },
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[faceit-proxy] Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
