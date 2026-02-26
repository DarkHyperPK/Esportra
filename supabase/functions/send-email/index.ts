import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getTemplate } from "./templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY"); // Triggers CI/CD sync
const FROM_EMAIL = "Esportra <operations@esportra.com>";

interface EmailRequest {
    type: string;
    email: string;
    data: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not configured. Add it in Supabase Dashboard > Edge Functions > Secrets.");
        }

        // ── SECURITY: Require valid JWT or service_role key ──
        const authHeader = req.headers.get('Authorization') || '';
        const isServiceRole = authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;

        if (!isServiceRole) {
            // Verify the JWT token
            const { createClient } = await import("jsr:@supabase/supabase-js@2");
            const token = authHeader.replace('Bearer ', '');
            if (!token) {
                return new Response(JSON.stringify({ error: 'Authentication required' }), {
                    status: 401,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                });
            }
            const { data: { user }, error: authError } = await createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? ''
            ).auth.getUser(token);

            if (authError || !user) {
                return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                    status: 401,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                });
            }
        }

        // DEBUG: Log incoming request details
        console.log("[send-email] Incoming request headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));
        const bodyText = await req.text();
        console.log("[send-email] Incoming request body:", bodyText);

        const { type, email, data } = JSON.parse(bodyText) as EmailRequest;

        if (!type || !email) {
            throw new Error("Missing required fields: type, email");
        }

        // Get the HTML template and subject line
        const template = getTemplate(type, data);

        if (!template) {
            throw new Error(`Unknown email type: ${type}`);
        }

        console.log(`[send-email] Sending '${type}' email to ${email}`);

        // Send via Resend API
        const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [email],
                subject: template.subject,
                html: template.html,
            }),
        });

        const resendResult = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error("[send-email] Resend error:", resendResult);
            const errorMessage = resendResult?.message || resendResult?.error?.message || "Failed to send email via Resend";
            throw new Error(`${errorMessage} (Status: ${resendResponse.status})`);
        }

        console.log(`[send-email] Email sent successfully:`, resendResult.id || resendResult);

        return new Response(
            JSON.stringify({ success: true, id: resendResult.id }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error) {
        console.error("[send-email] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
});
