import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
    try {
        const now = new Date();

        // --- PART 1: Tournament Check-in Reminders (30m window) ---
        const tWindowStart = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
        const tWindowEnd = new Date(now.getTime() + 35 * 60 * 1000).toISOString();

        const { data: tournaments, error: tError } = await supabase
            .from('tournaments')
            .select('id, name, slug, start_date')
            .eq('check_in_required', true)
            .eq('check_in_reminder_sent', false)
            .eq('status', 'open')
            .lte('start_date', tWindowEnd)
            .gte('start_date', tWindowStart);

        if (!tError && tournaments && tournaments.length > 0) {
            console.log(`[automated-reminders] Found ${tournaments.length} tournaments for reminders.`);
            for (const tournament of tournaments) {
                await supabase.from('tournaments').update({ check_in_reminder_sent: true }).eq('id', tournament.id);

                const { data: participants } = await supabase
                    .from('tournament_participants')
                    .select(`
            id, participant_type, user_id, team_id,
            user:profiles!user_id (email, username),
            team:teams!team_id (owner:profiles!owner_id (email, username))
          `)
                    .eq('tournament_id', tournament.id)
                    .neq('status', 'checked_in');

                for (const p of (participants || [])) {
                    const email = p.participant_type === 'solo' ? p.user?.email : p.team?.owner?.email;
                    const name = p.participant_type === 'solo' ? p.user?.username : p.team?.owner?.username;
                    if (email) {
                        triggerEmail('CHECKIN_REMINDER', email, {
                            tournamentName: tournament.name,
                            tournamentUrl: `https://esportra.com/tournaments/${tournament.slug}`,
                            username: name || 'Player'
                        });
                    }
                }
            }
        }

        // --- PART 2: Match Check-in Reminders (DISABLED AS PER USER REQUEST) ---
        /*
        // matches often have a smaller check-in window (e.g. 15 mins)
        const mWindowEnd = new Date(now.getTime() + 20 * 60 * 1000).toISOString();
        const mWindowStart = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

        const { data: matches, error: mError } = await supabase
            .from('brkt_matches')
            .select(`
        id, scheduled_time, 
        team1:teams!team1_id (id, name, owner:profiles!owner_id (email, username)),
        team2:teams!team2_id (id, name, owner:profiles!owner_id (email, username)),
        version:brkt_versions!version_id (
          tournament:tournaments!tournament_id (name, slug)
        )
      `)
            .eq('status', 'scheduled') // or 'pending' if that's when they check in
            .eq('check_in_reminder_sent', false)
            .lte('scheduled_time', mWindowEnd)
            .gte('scheduled_time', mWindowStart);

        if (!mError && matches && matches.length > 0) {
            console.log(`[automated-reminders] Found ${matches.length} matches for reminders.`);
            for (const match of matches) {
                await supabase.from('brkt_matches').update({ check_in_reminder_sent: true }).eq('id', match.id);

                const teams = [
                    { info: match.team1, opponent: match.team2?.name },
                    { info: match.team2, opponent: match.team1?.name }
                ];

                for (const t of teams) {
                    if (t.info?.owner?.email) {
                        triggerEmail('MATCH_CHECKIN_REMINDER', t.info.owner.email, {
                            opponent: t.opponent || 'TBD',
                            minutesRemaining: '15',
                            matchUrl: `https://esportra.com/tournaments/${match.version?.tournament?.slug}/match/${match.id}`,
                            username: t.info.owner.username || 'Captain'
                        });
                    }
                }
            }
        }
        */

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        console.error('[automated-reminders] Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});

async function triggerEmail(type: string, email: string, data: any) {
    try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ type, email, data })
        });
    } catch (e) {
        console.error(`[automated-reminders] Failed to trigger ${type} for ${email}:`, e);
    }
}
