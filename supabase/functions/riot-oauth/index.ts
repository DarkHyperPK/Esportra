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
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // Contains the Supabase user_id
        const error = url.searchParams.get("error");

        // Handle Riot auth errors (user denied, etc.)
        if (error) {
            console.error("[riot-oauth] Riot returned error:", error);
            return Response.redirect(
                `${FRONTEND_ERROR_URL}&reason=${encodeURIComponent(error)}`,
                302
            );
        }

        // Validate required params
        if (!code || !state) {
            console.error("[riot-oauth] Missing code or state parameter");
            return Response.redirect(
                `${FRONTEND_ERROR_URL}&reason=missing_params`,
                302
            );
        }

        // The state contains the user_id of the Supabase user who initiated the link
        const userId = state;

        // ── Step 1: Exchange authorization code for access token ──
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
                redirect_uri: REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("[riot-oauth] Token exchange failed:", errorText);
            return Response.redirect(
                `${FRONTEND_ERROR_URL}&reason=token_exchange_failed`,
                302
            );
        }

        const tokenData = await tokenResponse.json();
        const { access_token, refresh_token, expires_in } = tokenData;
        console.log("[riot-oauth] Token exchange successful. Expires in:", expires_in);

        // ── Step 2: Fetch Riot account info (PUUID, Game Name, Tag Line) ──
        console.log("[riot-oauth] Fetching Riot account info...");
        const accountResponse = await fetch(RIOT_ACCOUNT_URL, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        if (!accountResponse.ok) {
            const errorText = await accountResponse.text();
            console.error("[riot-oauth] Account fetch failed:", errorText);
            return Response.redirect(
                `${FRONTEND_ERROR_URL}&reason=account_fetch_failed`,
                302
            );
        }

        const accountData = await accountResponse.json();
        const { puuid, gameName, tagLine } = accountData;
        console.log(`[riot-oauth] Riot account: ${gameName}#${tagLine} (PUUID: ${puuid})`);

        // ── Step 2b: Detect active Valorant shard for correct API routing ──
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
                    console.log(`[riot-oauth] Detected Valorant shard: ${valRegion}`);
                } else {
                    console.warn("[riot-oauth] Shard detection failed:", shardResp.status);
                }
            }
        } catch (shardErr) {
            console.warn("[riot-oauth] Shard detection error (non-fatal):", shardErr);
        }

        // ── Step 3: Upsert into riot_accounts table ──
        console.log("[riot-oauth] Upserting Riot account into database...");
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Check if this PUUID is already linked to a DIFFERENT user
        const { data: existingAccount } = await supabaseAdmin
            .from("riot_accounts")
            .select("user_id")
            .eq("puuid", puuid)
            .maybeSingle();

        if (existingAccount && existingAccount.user_id !== userId) {
            console.error("[riot-oauth] PUUID already linked to another user:", existingAccount.user_id);
            return Response.redirect(
                `${FRONTEND_ERROR_URL}&reason=account_already_linked`,
                302
            );
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
        if (valRegion) {
            upsertData.region = valRegion;
        }

        const { error: upsertError } = await supabaseAdmin
            .from("riot_accounts")
            .upsert(upsertData, { onConflict: "user_id" });

        if (upsertError) {
            console.error("[riot-oauth] DB upsert failed:", upsertError);
            return Response.redirect(
                `${FRONTEND_ERROR_URL}&reason=db_error`,
                302
            );
        }

        // ── Step 4: Sync to profiles.riot_tag for ease of display ──
        console.log("[riot-oauth] Syncing to profiles table...");
        await supabaseAdmin
            .from("profiles")
            .update({ riot_tag: `${gameName}#${tagLine}`, updated_at: new Date().toISOString() })
            .eq("id", userId);

        console.log(`[riot-oauth] Successfully linked ${gameName}#${tagLine} to user ${userId}`);

        // ── Step 4: Redirect user back to frontend ──
        return Response.redirect(
            `${FRONTEND_SUCCESS_URL}&game_name=${encodeURIComponent(gameName)}&tag_line=${encodeURIComponent(tagLine)}`,
            302
        );
    } catch (err) {
        console.error("[riot-oauth] Unexpected error:", err);
        return Response.redirect(
            `${FRONTEND_ERROR_URL}&reason=unexpected_error`,
            302
        );
    }
});
