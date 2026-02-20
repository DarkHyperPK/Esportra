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

        // 1. Get auth header to verify the requester
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const { data: { user: requester }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
        if (authError || !requester) throw new Error('Unauthorized requester')

        // 2. Check if requester is an admin
        const { data: roleData, error: roleError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', requester.id)
            .eq('role', 'admin')
            .single()

        if (roleError || !roleData) {
            throw new Error('Forbidden: Only admins can perform this action')
        }

        const { action, targetUserId, payload } = await req.json()

        if (!action || !targetUserId) {
            throw new Error('Action and targetUserId are required')
        }

        console.log(`Admin ${requester.email} performing ${action} on ${targetUserId}`)

        if (action === 'delete-user') {
            // Delete associated data
            // Note: In a production app, you might want to soft-delete or handle cascades better

            // Delete tournaments
            await supabaseClient.from('tournaments').delete().eq('user_id', targetUserId)

            // Delete roles
            await supabaseClient.from('user_roles').delete().eq('user_id', targetUserId)

            // Delete profile
            await supabaseClient.from('profiles').delete().eq('id', targetUserId)

            // Finally, delete from Auth
            const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(targetUserId)
            if (deleteError) throw deleteError

            return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'update-role') {
            const { newRole } = payload
            if (!newRole) throw new Error('newRole is required for update-role')

            // Remove existing roles
            await supabaseClient.from('user_roles').delete().eq('user_id', targetUserId)

            // Insert new role
            const { error: insertError } = await supabaseClient
                .from('user_roles')
                .insert({ user_id: targetUserId, role: newRole })

            if (insertError) throw insertError

            return new Response(JSON.stringify({ success: true, message: 'Role updated successfully' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        throw new Error(`Unsupported action: ${action}`)

    } catch (error: any) {
        console.error("Admin Action Error:", error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
