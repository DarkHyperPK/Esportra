import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Environment variables (set via Supabase Dashboard > Edge Functions > Secrets)
const RIOT_CLIENT_ID = Deno.env.get("RIOT_CLIENT_ID")!;
const RIOT_CLIENT_SECRET = Deno.env.get("RIOT_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// The URL of this Edge Function (used as redirect_uri when talking to Riot)
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/riot-oauth`;

// Where to send users after linking succeeds/fails
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://esportra.com";
const FRONTEND_SUCCESS_URL = `${FRONTEND_URL}/player/profile?riot_linked=success`;
const FRONTEND_ERROR_URL = `${FRONTEND_URL}/player/profile?riot_linked=error`;

// Riot API endpoints
const RIOT_TOKEN_URL = "https://auth.riotgames.com/token";
const RIOT_USERINFO_URL = "https://auth.riotgames.com/userinfo";
const RIOT_ACCOUNT_URL = "https://asia.api.riotgames.com/riot/account/v1/accounts/me";

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers":
                    "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const url = new URL(req.url);

        // ── STEP 1: Handle Riot Redirect (GET) ──
        if (req.method === "GET") {
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state");
            const error = url.searchParams.get("error");

            if (error) {
                console.error("[riot-oauth] Riot returned error:", error);
                return Response.redirect(`${FRONTEND_ERROR_URL}&reason=${encodeURIComponent(error)}`, 302);
            }
            if (!code || !state) {
                console.error("[riot-oauth] Missing code or state parameter");
                return Response.redirect(`${FRONTEND_ERROR_URL}&reason=missing_params`, 302);
            }

            // Redirect back to the frontend so it can verify the CSRF state
            return Response.redirect(`${FRONTEND_URL}/player/profile?riot_callback=true&code=${code}&state=${state}`, 302);
        }

        // ── STEP 2: Handle Frontend POST Request (Token Exchange) ──
        if (req.method === "POST") {
            // Validate JWT to identify the user
            const authHeader = req.headers.get("Authorization");
            if (!authHeader) {
                return new Response(JSON.stringify({ error: "Missing optimization header" }), { status: 401 });
            }

            const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

            if (authError || !user) {
                return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 });
            }

            const userId = user.id;
            const { code } = await req.json();
            if (!code) {
                return new Response(JSON.stringify({ error: "Missing authorization code" }), { status: 400 });
            }

            // Exchanging code for token
            console.log("[riot-oauth] Exchanging code for token...");
            const tokenResponse = await fetch(RIOT_TOKEN_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${btoa(`${RIOT_CLIENT_ID}:${RIOT_CLIENT_SECRET}`)}`,
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: REDIRECT_URI, // Must strictly match the one used during authorization
                }),
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                console.error("[riot-oauth] Token exchange failed:", errorText);
                return new Response(JSON.stringify({ error: "Token exchange failed" }), { status: 400 });
            }

            const tokenData = await tokenResponse.json();
            const { access_token, refresh_token, expires_in } = tokenData;

            // Fetching Riot account info
            console.log("[riot-oauth] Fetching Riot account info...");
            const accountResponse = await fetch(RIOT_ACCOUNT_URL, {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            if (!accountResponse.ok) {
                const errorText = await accountResponse.text();
                console.error("[riot-oauth] Account fetch failed:", errorText);
                return new Response(JSON.stringify({ error: "Account fetch failed" }), { status: 400 });
            }

            const accountData = await accountResponse.json();
            const { puuid, gameName, tagLine } = accountData;

            // Detect active Valorant shard
            let valRegion: string | null = null;
            try {
                const RIOT_API_KEY = Deno.env.get("RIOT_API_KEY");
                if (RIOT_API_KEY) {
                    const shardResp = await fetch(
                        `https://americas.api.riotgames.com/riot/account/v1/active-shards/by-game/val/by-puuid/${puuid}`,
                        { headers: { "X-Riot-Token": RIOT_API_KEY } }
                    );
                    if (shardResp.ok) {
                        const shardData = await shardResp.json();
                        valRegion = shardData.activeShard?.toLowerCase() || null;
                    }
                }
            } catch (shardErr) {
                console.warn("[riot-oauth] Shard detection error:", shardErr);
            }

            // Upsert into database
            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data: existingAccount } = await supabaseAdmin
                .from("riot_accounts")
                .select("user_id")
                .eq("puuid", puuid)
                .maybeSingle();

            if (existingAccount && existingAccount.user_id !== userId) {
                return new Response(JSON.stringify({ error: "Account already linked to another user" }), { status: 409 });
            }

            const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
            const upsertData: Record<string, any> = {
                user_id: userId,
                puuid,
                game_name: gameName,
                tag_line: tagLine,
                access_token,
                refresh_token,
                token_expires_at: tokenExpiresAt,
                updated_at: new Date().toISOString(),
            };
            if (valRegion) upsertData.region = valRegion;

            const { error: upsertError } = await supabaseAdmin
                .from("riot_accounts")
                .upsert(upsertData, { onConflict: "user_id" });

            if (upsertError) {
                console.error("[riot-oauth] DB upsert failed:", upsertError);
                return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
            }

            // Sync to profiles.riot_tag
            await supabaseAdmin
                .from("profiles")
                .update({ riot_tag: `${gameName}#${tagLine}`, updated_at: new Date().toISOString() })
                .eq("id", userId);

            console.log(`[riot-oauth] Successfully linked ${gameName}#${tagLine} to user ${userId}`);

            return new Response(JSON.stringify({ success: true, gameName, tagLine }), {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        return new Response("Method Not Allowed", { status: 405 });
    } catch (err) {
        console.error("[riot-oauth] Unexpected error:", err);
        return new Response(JSON.stringify({ error: "Unexpected server error" }), { status: 500 });
    }
});
