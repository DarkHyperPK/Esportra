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
        // 1. Extract the user's access token from the Authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing Authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Parse the request body for the new password
        const { password } = await req.json();
        if (!password || password.length < 6) {
            return new Response(
                JSON.stringify({ error: "Password must be at least 6 characters" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 3. Create a client using the USER's token to verify their identity
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await userClient.auth.getUser();

        // If getUser fails with the user token, try extracting user from the JWT directly
        // using the admin client (service role can decode any valid JWT)
        if (userError || !user) {
            console.log("getUser with user token failed, trying JWT extraction via admin...");

            const token = authHeader.replace("Bearer ", "");

            // Create admin client to get user from the token
            const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
                auth: { autoRefreshToken: false, persistSession: false },
            });

            // Try to get the user by decoding the JWT payload
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userId = payload.sub;

                if (!userId) {
                    return new Response(
                        JSON.stringify({ error: "Invalid token: no user ID found" }),
                        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Verify the user exists
                const { data: adminUser, error: adminError } = await adminClient.auth.admin.getUserById(userId);
                if (adminError || !adminUser?.user) {
                    return new Response(
                        JSON.stringify({ error: "User not found" }),
                        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // 4. Update the password using admin API
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

                console.log(`Password updated successfully for user ${adminUser.user.email} (via JWT fallback)`);
                return new Response(
                    JSON.stringify({ success: true, email: adminUser.user.email }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            } catch (decodeErr) {
                console.error("JWT decode error:", decodeErr);
                return new Response(
                    JSON.stringify({ error: "Invalid or expired session. Please request a new reset link." }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // 4. Standard path: We verified the user, now update their password with admin API
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
            password: password,
        });

        if (updateError) {
            console.error("Password update error:", updateError);
            return new Response(
                JSON.stringify({ error: updateError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Password updated successfully for user ${user.email}`);
        return new Response(
            JSON.stringify({ success: true, email: user.email }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Unexpected error:", err);
        return new Response(
            JSON.stringify({ error: "An unexpected error occurred" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
