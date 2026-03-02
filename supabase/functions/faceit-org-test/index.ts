import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FACEIT_API_KEY = Deno.env.get("FACEIT_API_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function probe(label: string, url: string, method = "GET", body?: object) {
    try {
        const res = await fetch(url, {
            method,
            headers: {
                "Authorization": `Bearer ${FACEIT_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        let data: unknown;
        const text = await res.text();
        try { data = JSON.parse(text); } catch { data = text; }
        return { label, url, status: res.status, ok: res.ok, data };
    } catch (err: any) {
        return { label, url, status: 0, ok: false, data: null, error: err.message };
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const tests = await Promise.all([
        // ── DATA API (read-only, open.faceit.com) ──────────────────
        probe(
            "Data API — player lookup",
            "https://open.faceit.com/data/v4/players?nickname=s1mple"
        ),
        probe(
            "Data API — game info",
            "https://open.faceit.com/data/v4/games/cs2"
        ),

        // ── CORE / AUTH API ────────────────────────────────────────
        probe(
            "Core API — current user/app identity",
            "https://api.faceit.com/core/v1/users/me"
        ),

        // ── ORGANIZER API v1 ───────────────────────────────────────
        probe(
            "Organizer API — get my organizer info",
            "https://api.faceit.com/organizer/v1/organizers/me"
        ),
        probe(
            "Organizer API — list my hubs",
            "https://api.faceit.com/organizer/v1/hubs"
        ),
        probe(
            "Organizer API — list my championships",
            "https://api.faceit.com/organizer/v1/championships"
        ),

        // ── MATCH API v2 ───────────────────────────────────────────
        // POST a dummy match creation — the error message reveals if auth passes
        probe(
            "Match API v2 — create match (dummy, expect 400 not 401/403)",
            "https://api.faceit.com/match/v2/match",
            "POST",
            { type: "SCRIMMING", game: "cs2", region: "EU", organized: true }
        ),

        // ── HUB API (alias) ────────────────────────────────────────
        probe(
            "Hub API — list hubs for organizer",
            "https://api.faceit.com/hubs/v1"
        ),
    ]);

    return new Response(JSON.stringify({ key_prefix: FACEIT_API_KEY?.slice(0, 8) + "...", tests }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
});
