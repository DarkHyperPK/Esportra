import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, sponsor_id } = await req.json()

        if (!email || !sponsor_id) {
            throw new Error("Email and sponsor_id are required")
        }

        // 1. Fetch Sponsor Name for the email
        const { data: sponsorData, error: sponsorError } = await supabaseClient
            .from('sponsors')
            .select('name')
            .eq('id', sponsor_id)
            .single()

        if (sponsorError || !sponsorData) {
            throw new Error(`Sponsor not found: ${sponsorError?.message || 'Unknown error'}`)
        }

        const sponsorName = sponsorData.name
        console.log(`Processing onboarding for ${email} to ${sponsorName}`)

        // 2. Check if user already exists
        const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers()
        if (userError) throw userError

        const existingUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

        let user;
        let isNewUser = false;
        let setupUrl = "";

        if (existingUser) {
            console.log("Existing user detected. Linking and sending welcome email.")
            user = existingUser
        } else {
            console.log("New user detected. Creating account and generating setup link.")
            isNewUser = true

            // Create the user (they will need to reset password via the link)
            const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
                email,
                email_confirm: true,
                user_metadata: { sponsor_id }
            })
            if (createError) throw createError
            user = newUser.user

            // Generate a secure password setup link (acts as recovery/invite)
            const partnerUrl = Deno.env.get('PARTNER_URL') || 'https://partner.esportra.com'
            const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: { redirectTo: `${partnerUrl}/set-password` }
            })
            if (linkError) throw linkError
            setupUrl = linkData.properties.action_link
        }

        // 3. Link to Sponsor Account
        const { error: linkError } = await supabaseClient
            .from('sponsor_accounts')
            .upsert({
                user_id: user.id,
                sponsor_id: sponsor_id,
                role: 'owner'
            }, { onConflict: 'user_id, sponsor_id' })

        if (linkError) throw linkError

        // 4. Trigger Branded Email via send-email function
        const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`
        const emailPayload = {
            to: email,
            template: isNewUser ? 'PARTNER_INVITE' : 'PARTNER_WELCOME',
            data: {
                sponsorName,
                setupUrl,
                email
            }
        }

        const emailResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify(emailPayload)
        })

        if (!emailResponse.ok) {
            const errText = await emailResponse.text()
            console.error("Email Function Error:", errText)
            // We don't fail the whole request if email fails, but we log it
        }

        return new Response(JSON.stringify({
            success: true,
            isNewUser,
            user_id: user.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error("Critical Function Error:", error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
