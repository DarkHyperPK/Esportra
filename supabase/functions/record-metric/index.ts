import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Simple IP-to-country lookup using ip-api.com
async function getCountryFromIP(ip: string): Promise<string> {
    if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) return "Local/Unknown";
    try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,country`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return "Unknown";
        const data = await res.json();
        return data.country || "Unknown";
    } catch (err) {
        console.error(`[GeoIP] Error for IP ${ip}:`, err);
        return "Unknown";
    }
}

// Convert DOB to Age Group
function getAgeGroup(dob: string | null): string {
    if (!dob) return "unknown";
    try {
        const birth = new Date(dob);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;

        if (age < 13) return "<13";
        if (age <= 17) return "13-17";
        if (age <= 24) return "18-24";
        if (age <= 34) return "25-34";
        return "35+";
    } catch {
        return "unknown";
    }
}

// Generate a deterministic visitor_id from IP + daily salt
// This ensures uniqueness per day without storing raw IPs
async function generateVisitorId(ip: string): Promise<string> {
    if (ip === "unknown") return "unknown";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const raw = `${ip}:${today}:esportra-salt-v1`;
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
    // CORS handles
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
            },
        });
    }

    const corsHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    };

    try {
        const body = await req.json();
        const { sponsor_id, event_type } = body;

        if (!sponsor_id || !event_type) {
            return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: corsHeaders });
        }

        // Identify Client IP for GeoIP and visitor_id
        const forwarded = req.headers.get("x-forwarded-for");
        const clientIP = forwarded?.split(",")[0]?.trim() || "unknown";

        // Auth Check: Identify Age Group if user is logged in
        const authHeader = req.headers.get("authorization");

        const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

        const countryPromise = getCountryFromIP(clientIP);
        const visitorIdPromise = generateVisitorId(clientIP);
        let ageGroupPromise = Promise.resolve("unknown");

        if (authHeader && authHeader !== "null" && authHeader !== "undefined") {
            const token = authHeader.replace("Bearer ", "");
            ageGroupPromise = (async () => {
                try {
                    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
                    if (!user) return "unknown";

                    const { data: profile } = await supabaseAdmin
                        .from("profiles")
                        .select("date_of_birth")
                        .eq("id", user.id)
                        .maybeSingle();

                    return getAgeGroup(profile?.date_of_birth || null);
                } catch {
                    return "unknown";
                }
            })();
        }

        const [country, resolvedAgeGroup, visitorId] = await Promise.all([
            countryPromise,
            ageGroupPromise,
            visitorIdPromise,
        ]);

        // Track the interaction
        const { data, error } = await supabaseAdmin
            .from("sponsor_impressions")
            .insert({
                sponsor_id,
                event_type,
                page_url: body.page_url || req.headers.get("referer") || null,
                visitor_id: visitorId,
                metadata: { country, age_group: resolvedAgeGroup },
            })
            .select()
            .single();

        if (error) throw error;

        return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: corsHeaders });

    } catch (err) {
        console.error("[System Error]", err);
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
    }
});
