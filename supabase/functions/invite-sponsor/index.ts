import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── AUTH CHECK: Verify caller is an authenticated admin ──
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verify the JWT and get the calling user
        const token = authHeader.replace('Bearer ', '')
        const { data: { user: caller }, error: authError } = await createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        ).auth.getUser(token)

        if (authError || !caller) {
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Verify caller is a platform admin
        const { data: callerProfile } = await supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', caller.id)
            .single()

        if (!callerProfile?.is_admin) {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin privileges required' }), {
                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const { email, sponsor_id, application_id } = await req.json()

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
            console.log("Existing user detected. Linking to sponsor.")
            user = existingUser
        } else {
            console.log("New user detected. Creating account.")
            isNewUser = true

            // Create the user (they will need to set password via the link)
            const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
                email,
                email_confirm: true,
                user_metadata: { sponsor_id }
            })
            if (createError) throw createError
            user = newUser.user
        }

        // ALWAYS generate a password setup link (existing users may not have a password if they use OAuth)
        const partnerUrl = Deno.env.get('PARTNER_URL') || 'https://partner.esportra.com'
        const { data: linkData, error: linkErr } = await supabaseClient.auth.admin.generateLink({
            type: 'recovery',
            email,
        })
        if (linkErr) throw linkErr

        // Use token_hash to keep users on the Partner Portal domain (not api.esportra.com)
        const tokenHash = linkData.properties.hashed_token
        setupUrl = `${partnerUrl}/set-password?token_hash=${tokenHash}&type=recovery`

        // 3. Link to Sponsor Account with onboarding_meta initialized
        const { error: linkError } = await supabaseClient
            .from('sponsor_accounts')
            .upsert({
                user_id: user.id,
                sponsor_id: sponsor_id,
                role: 'owner',
                onboarding_meta: { completed: false, current_step: 0, completed_at: null, steps: {} }
            }, { onConflict: 'user_id, sponsor_id' })

        if (linkError) throw linkError

        // 4. If application_id provided, mark application as approved
        if (application_id) {
            const { error: appError } = await supabaseClient
                .from('partner_applications')
                .update({ status: 'approved' })
                .eq('id', application_id)

            if (appError) {
                console.error("Failed to update application status:", appError.message)
                // Non-fatal — don't fail the whole invite
            }
        }

        // 5. Always send PARTNER_INVITE with setup link (so they can set a password for the portal)
        const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`
        const emailPayload = {
            type: 'PARTNER_INVITE',
            email: email,
            data: {
                sponsorName,
                setupUrl,
                email
            }
        }

        console.log(`Sending ${emailPayload.type} email to ${email} via send-email function`)

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
        } else {
            console.log("Email sent successfully!")
        }

        return new Response(JSON.stringify({
            success: true,
            isNewUser,
            user_id: user.id,
            setupUrl,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Critical Function Error:", message)
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
