import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create a Supabase client with the SERVICE ROLE key
        // This is required to use auth.admin methods
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, sponsor_id, redirect_url } = await req.json()

        if (!email || !sponsor_id) {
            throw new Error("Email and sponsor_id are required")
        }

        // Determine Redirect URL
        // This should point to the Partner Portal's "Set Password" page
        // Example: http://localhost:5173/set-password
        const partnerUrl = Deno.env.get('PARTNER_URL') || 'http://localhost:5173'
        const redirectTo = redirect_url || `${partnerUrl}/set-password`

        console.log(`Inviting ${email} to sponsor ${sponsor_id} with redirect ${redirectTo}`)

        // 1. Invite User
        // This sends the standard Supabase invite email (which we customized)
        // The link in the email will act as a password reset link
        const { data, error } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: redirectTo,
            data: {
                sponsor_id: sponsor_id
            }
        })

        if (error) {
            console.error("Invite Error:", error)
            throw error
        }

        // 2. Link to Sponsor Account (Pre-emptive)
        if (data.user) {
            const { error: linkError } = await supabaseClient
                .from('sponsor_accounts')
                .upsert({
                    user_id: data.user.id,
                    sponsor_id: sponsor_id,
                    role: 'owner'
                }, { onConflict: 'user_id, sponsor_id' })

            if (linkError) {
                console.error("Link Error:", linkError)
                // We don't fail the whole request if linking fails, as the user is created
                // But we should probably log it well
            }
        }

        return new Response(JSON.stringify({ success: true, user: data.user }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
