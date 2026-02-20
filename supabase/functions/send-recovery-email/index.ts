import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://api.esportra.com";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://esportra.com";
const FROM_EMAIL = "Esportra <operations@esportra.com>";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

// ── Branded Recovery Email Template ──
function getRecoveryTemplate(actionLink: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password – Esportra</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #0a0a0a; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a;">
  <span class="preheader">Reset your Esportra password – this link expires in 1 hour.</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="400" cellspacing="0" cellpadding="0" style="max-width:400px; width:100%;">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${FRONTEND_URL}" target="_blank" style="text-decoration: none; outline: none; border: none;">
                <img src="${SUPABASE_URL}/storage/v1/object/public/system.assets.website/eSportra%20Logo/eSPORTRA%20white%20transparent.png" alt="Esportra Logo" width="200" style="display: block; border: 0; outline: none; text-decoration: none;" />
              </a>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color:#111111; border: 1px solid #222222; border-radius: 12px; padding: 40px 32px;">
              <!-- Lock Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); line-height: 56px; text-align: center; font-size: 24px;">
                  &#128274;
                </div>
              </div>

              <h2 style="margin:0 0 8px; font-size:22px; color:#ffffff; font-weight:700; text-align:center;">Reset Your Password</h2>
              <p style="margin:0 0 24px; font-size:15px; color:#999999; line-height:1.6; text-align:center;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #e11d48, #be123c); border-radius: 8px; padding: 14px 32px;">
                    <a href="${actionLink}" style="color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">RESET PASSWORD</a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <p style="margin:24px 0 0; font-size:13px; color:#666666; text-align:center; line-height:1.6;">
                This link will expire in <strong style="color:#999;">1 hour</strong>. If you didn't request this, you can safely ignore this email.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #222222; margin: 24px 0;" />

              <!-- Fallback Link -->
              <p style="margin:0; font-size:12px; color:#555555; line-height:1.6; word-break:break-all;">
                If the button doesn't work, copy and paste this link:<br/>
                <a href="${actionLink}" style="color:#f43f5e; text-decoration:none;">${actionLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin:0; font-size:12px; color:#555555; line-height:1.6;">
                &copy; ${new Date().getFullYear()} Esportra. All rights reserved.<br>
                You received this email because a password reset was requested for your account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error(
                "RESEND_API_KEY is not configured. Add it in Edge Function secrets."
            );
        }
        if (!SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error(
                "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it in Edge Function secrets."
            );
        }

        const { email } = await req.json();
        if (!email || typeof email !== "string") {
            throw new Error("A valid email address is required.");
        }

        // Create admin Supabase client
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Generate recovery link WITHOUT sending GoTrue's default email
        const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
                redirectTo: `${FRONTEND_URL}/auth/reset-password`,
            },
        });

        if (linkError) {
            console.error("generateLink error:", linkError);
            throw new Error(linkError.message);
        }

        const actionLink = data?.properties?.action_link;
        if (!actionLink) {
            throw new Error("Failed to generate recovery link.");
        }

        console.log(`📧 Sending branded recovery email to ${email}`);

        // Send branded email via Resend API
        const html = getRecoveryTemplate(actionLink);
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [email],
                subject: "Reset Your Esportra Password",
                html,
            }),
        });

        const resData = await res.json();

        if (!res.ok) {
            console.error("Resend API error:", resData);
            throw new Error(
                `Failed to send email: ${resData?.message || JSON.stringify(resData)}`
            );
        }

        console.log(`✅ Recovery email sent to ${email}`, resData);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("send-recovery-email error:", message);
        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
