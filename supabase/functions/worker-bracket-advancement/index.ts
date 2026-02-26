import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        // ── SECURITY: Verify the request is from a trusted internal source ──
        const authHeader = req.headers.get('Authorization') || ''
        const webhookSecret = req.headers.get('x-webhook-secret') || ''
        const expectedSecret = Deno.env.get('WEBHOOK_SECRET') || ''

        const isServiceRole = authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        const isValidWebhook = expectedSecret !== '' && webhookSecret === expectedSecret

        if (!isServiceRole && !isValidWebhook) {
            console.error('[worker-bracket-advancement] Unauthorized request blocked')
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const payload = await req.json()
        const record = payload.record;

        if (!record || !record.match_id) {
            return new Response('Invalid payload', { status: 400 })
        }

        const matchId = record.match_id;
        const winnerId = record.winner_id;
        const loserId = record.loser_id;

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get the match's version_id so we know what bracket we're in
        const { data: sourceMatch, error: sourceError } = await supabaseClient
            .from('brkt_matches')
            .select('version_id')
            .eq('id', matchId)
            .single()

        if (sourceError || !sourceMatch) {
            throw new Error(`Match ${matchId} not found`)
        }

        const versionId = sourceMatch.version_id

        // 2. Helper to advance a team
        const advanceTeam = async (teamId: string, type: 'winner' | 'loser') => {
            if (!teamId) return;

            const { data: edges, error: edgesError } = await supabaseClient
                .from('brkt_advancements')
                .select('*')
                .eq('version_id', versionId)
                .eq('source_match_id', matchId)
                .eq('type', type)

            if (edgesError) throw edgesError;

            for (const edge of edges) {
                const targetMatchId = edge.target_match_id;
                const targetSlot = edge.target_slot; // 1 or 2

                const updateField = targetSlot === 1 ? 'team1_id' : 'team2_id';
                console.log(`[Advance] Moving team ${teamId} to match ${targetMatchId} slot ${targetSlot}`);

                const { error: updateError } = await supabaseClient
                    .from('brkt_matches')
                    .update({ [updateField]: teamId })
                    .eq('id', targetMatchId)

                if (updateError) throw updateError;
            }
        }

        // 3. Perform advancements
        await advanceTeam(winnerId, 'winner');
        await advanceTeam(loserId, 'loser');

        // 4. Mark event as processed
        await supabaseClient
            .from('match_completed_events')
            .update({ status: 'processed', processed_at: new Date().toISOString() })
            .eq('id', record.id)

        // 5. Trigger cache rebuild async
        // We trigger it asynchronously without awaiting so the webhook returns immediately
        console.log(`[Advance] Triggering UI Cache Rebuild for version: ${versionId}`);
        supabaseClient.functions.invoke('compute-bracket-ui-cache', {
            body: { versionId }
        }).catch(err => console.error('[Advance] Cache rebuild trigger failed:', err));

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
})
