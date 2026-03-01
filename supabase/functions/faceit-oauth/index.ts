import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FACEIT_CLIENT_ID = Deno.env.get("FACEIT_CLIENT_ID")!;
const FACEIT_CLIENT_SECRET = Deno.env.get("FACEIT_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Must match the redirect_uri registered in the Faceit Developer Portal
const REDIRECT_URI = Deno.env.get("FACEIT_REDIRECT_URI") || `${SUPABASE_URL}/functions/v1/faceit-oauth`;

// Where to send users after linking succeeds/fails
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://esportra.com";

const FACEIT_TOKEN_URL = "https://api.faceit.com/auth/v1/oauth/token";
const FACEIT_USERINFO_URL = "https://api.faceit.com/auth/v1/oauth/userinfo";

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const url = new URL(req.url);

        // ── STEP 1: Receive redirect from Faceit (GET) ──
        // Faceit redirects here with ?code=...&state=...
        // We relay them to the frontend so it can verify the CSRF state.
        if (req.method === "GET") {
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state");
            const error = url.searchParams.get("error");

            if (error) {
                console.error("[faceit-oauth] Faceit returned error:", error);
                return Response.redirect(
                    `${FRONTEND_URL}/player/profile?faceit_linked=error&reason=${encodeURIComponent(error)}`,
                    302
                );
            }
            if (!code || !state) {
                console.error("[faceit-oauth] Missing code or state parameter");
                return Response.redirect(
                    `${FRONTEND_URL}/player/profile?faceit_linked=error&reason=missing_params`,
                    302
                );
            }

            return Response.redirect(
                `${FRONTEND_URL}/player/profile?faceit_callback=true&code=${code}&state=${state}`,
                302
            );
        }

        // ── STEP 2: Frontend POSTs the code for server-side token exchange ──
        if (req.method === "POST") {
            const authHeader = req.headers.get("Authorization");
            if (!authHeader) {
                return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401 });
            }

            const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

            if (authError || !user) {
                return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 });
            }

            const userId = user.id;
            const body = await req.json();
            const { code } = body;
            if (!code) {
                return new Response(JSON.stringify({ error: "Missing authorization code" }), { status: 400 });
            }

            // Exchange authorization code for access + refresh tokens
            console.log("[faceit-oauth] Exchanging code for token...");
            const tokenResponse = await fetch(FACEIT_TOKEN_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${btoa(`${FACEIT_CLIENT_ID}:${FACEIT_CLIENT_SECRET}`)}`,
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: REDIRECT_URI,
                }),
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                console.error("[faceit-oauth] Token exchange failed:", errorText);
                return new Response(JSON.stringify({ error: "Token exchange failed", detail: errorText }), { status: 400 });
            }

            const tokenData = await tokenResponse.json();
            const { access_token, refresh_token, expires_in } = tokenData;

            // Fetch Faceit player identity via userinfo endpoint
            console.log("[faceit-oauth] Fetching Faceit user info...");
            const userinfoResponse = await fetch(FACEIT_USERINFO_URL, {
                headers: { "Authorization": `Bearer ${access_token}` },
            });

            if (!userinfoResponse.ok) {
                const errorText = await userinfoResponse.text();
                console.error("[faceit-oauth] Userinfo fetch failed:", errorText);
                return new Response(JSON.stringify({ error: "Userinfo fetch failed" }), { status: 400 });
            }

            const userinfo = await userinfoResponse.json();
            // Faceit userinfo response shape: { sub, nickname, picture, email, ... }
            const faceitId: string = userinfo.sub || userinfo.guid;
            const nickname: string = userinfo.nickname;
            const avatarUrl: string | null = userinfo.picture || null;

            if (!faceitId || !nickname) {
                console.error("[faceit-oauth] Missing faceit_id or nickname in userinfo:", userinfo);
                return new Response(JSON.stringify({ error: "Invalid Faceit user data" }), { status: 400 });
            }

            // Guard: this Faceit account must not be linked to a different user
            const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data: existingAccount } = await supabaseAdmin
                .from("faceit_accounts")
                .select("user_id")
                .eq("faceit_id", faceitId)
                .maybeSingle();

            if (existingAccount && existingAccount.user_id !== userId) {
                return new Response(
                    JSON.stringify({ error: "This Faceit account is already linked to another user" }),
                    { status: 409 }
                );
            }

            const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

            const { error: upsertError } = await supabaseAdmin
                .from("faceit_accounts")
                .upsert({
                    user_id: userId,
                    faceit_id: faceitId,
                    nickname,
                    avatar_url: avatarUrl,
                    access_token,
                    refresh_token: refresh_token || null,
                    token_expires_at: tokenExpiresAt,
                    updated_at: new Date().toISOString(),
                }, { onConflict: "user_id" });

            if (upsertError) {
                console.error("[faceit-oauth] DB upsert failed:", upsertError);
                return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
            }

            // Sync nickname to profiles.faceit_nickname
            await supabaseAdmin
                .from("profiles")
                .update({ faceit_nickname: nickname, updated_at: new Date().toISOString() })
                .eq("id", userId);

            console.log(`[faceit-oauth] Linked Faceit "${nickname}" (${faceitId}) to user ${userId}`);

            return new Response(JSON.stringify({ success: true, nickname, faceitId }), {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
        }

        return new Response("Method Not Allowed", { status: 405 });
    } catch (err) {
        console.error("[faceit-oauth] Unexpected error:", err);
        return new Response(JSON.stringify({ error: "Unexpected server error" }), { status: 500 });
    }
});
