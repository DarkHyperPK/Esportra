import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Parse the request body
        const { password, token_hash, type } = await req.json();

        if (!password || password.length < 6) {
            return new Response(
                JSON.stringify({ error: "Password must be at least 6 characters" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        let userId = "";
        let email = "";

        // --- Path A: Server-Side Token Verification (Stateless) ---
        if (token_hash && type) {
            console.log(`Verifying OTP on server: ${type}`);
            const { data: verifyData, error: verifyError } = await adminClient.auth.verifyOtp({
                token_hash,
                type: type as any,
            });

            if (verifyError || !verifyData.user) {
                console.error("Server-side verification failed:", verifyError);
                return new Response(
                    JSON.stringify({ error: `Verification failed: ${verifyError?.message || 'Invalid or expired link'}` }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            userId = verifyData.user.id;
            email = verifyData.user.email || "";
            console.log(`Token verified for ${email}`);
        }
        // --- Path B: Standard Authorization Header (Existing Session) ---
        else {
            const authHeader = req.headers.get("Authorization");
            if (!authHeader) {
                return new Response(
                    JSON.stringify({ error: "Missing Authorization header or token_hash" }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
                global: { headers: { Authorization: authHeader } },
            });

            const { data: { user }, error: userError } = await userClient.auth.getUser();

            if (userError || !user) {
                console.error("getUser with user token failed:", userError);
                return new Response(
                    JSON.stringify({ error: "Invalid or expired session. Please request a new reset link." }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            } else {
                userId = user.id;
                email = user.email || "";
            }
        }

        // --- Execute Password Update ---
        if (!userId) {
            return new Response(
                JSON.stringify({ error: "Could not identify user" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
            password: password,
        });

        if (updateError) {
            console.error("Password update error:", updateError);
            return new Response(
                JSON.stringify({ error: updateError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Password updated successfully for user ${userId}`);
        return new Response(
            JSON.stringify({ success: true, email }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("Unexpected error:", err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "An unexpected error occurred" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
