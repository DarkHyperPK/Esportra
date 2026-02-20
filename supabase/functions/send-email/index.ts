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
            throw new Error(resendResult?.message || "Failed to send email via Resend");
        }

        console.log(`[send-email] Email sent successfully:`, resendResult);

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
