import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Copied adapter logic for standalone execution
function adaptGraphToBracketMatches(nodes: any[], edges: any[], teamsMap: Map<string, any>) {
    return nodes.map(node => {
        const team1 = teamsMap.get(node.team1_id) || (node.team1_id ? { id: node.team1_id, name: 'TBD' } : undefined);
        const team2 = teamsMap.get(node.team2_id) || (node.team2_id ? { id: node.team2_id, name: 'TBD' } : undefined);
        const winner = teamsMap.get(node.winner_id);

        const winnerEdge = edges.find(e => e.source_match_id === node.id && e.type === 'winner');
        const loserEdge = edges.find(e => e.source_match_id === node.id && e.type === 'loser');

        let status = 'pending';
        if (node.status === 'in_progress') status = 'in_progress';
        else if (node.status === 'completed') status = 'completed';
        else if (node.status === 'disputed') status = 'disputed';

        const createBracketTeam = (team: any, seed: number) => {
            if (!team) return null;
            return { id: team.id, name: team.name, seed, logo_url: team.logo_url, eliminated: false };
        };

        const mapBracketType = (bracketType: string) => {
            if (bracketType === 'winners') return 'winners';
            if (bracketType === 'losers') return 'losers';
            if (bracketType === 'final') return 'final';
            return undefined;
        };

        return {
            id: `db-${node.id}`,
            round: node.round_index + 1,
            matchNumber: node.match_number,
            team1: createBracketTeam(team1, node.match_number * 2 - 1),
            team2: createBracketTeam(team2, node.match_number * 2),
            winner: createBracketTeam(winner, 0),
            score: null,
            team1_score: node.team1_score ?? null,
            team2_score: node.team2_score ?? null,
            status,
            scheduledTime: node.scheduled_time,
            bestOf: node.best_of,
            partyCode: node.party_code,
            bracketSide: mapBracketType(node.bracket_type),
            bracketType: node.bracket_type,
            nextMatchId: winnerEdge ? `db-${winnerEdge.target_match_id}` : null,
            loserNextMatchId: loserEdge ? `db-${loserEdge.target_match_id}` : null,
            stageId: node.version_id,
            groupId: node.group_id,
            x: node.x,
            y: node.y
        };
    });
}

serve(async (req) => {
    try {
        const { versionId } = await req.json()

        if (!versionId) {
            return new Response('Missing versionId payload', { status: 400 })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Fetch Matches
        const { data: nodes } = await supabaseClient.from('brkt_matches').select('*').eq('version_id', versionId);
        // Fetch Advancements
        const { data: edges } = await supabaseClient.from('brkt_advancements').select('*').eq('version_id', versionId);

        if (!nodes || !edges) {
            throw new Error("Failed to fetch bracket structure from DB");
        }

        // Teams lookup
        const teamIds = new Set<string>();
        nodes.forEach((n: any) => {
            if (n.team1_id) teamIds.add(n.team1_id);
            if (n.team2_id) teamIds.add(n.team2_id);
            if (n.winner_id) teamIds.add(n.winner_id);
            if (n.loser_id) teamIds.add(n.loser_id);
        });

        const teamsMap = new Map<string, any>();
        if (teamIds.size > 0) {
            const { data: teams } = await supabaseClient.from('teams').select('id, name, logo_url').in('id', Array.from(teamIds));
            teams?.forEach(t => teamsMap.set(t.id, t));
        }

        // Adapt the UI tree
        const uiState = adaptGraphToBracketMatches(nodes, edges, teamsMap);

        // Update the Cache
        const { error: updateError } = await supabaseClient
            .from('brkt_versions')
            .update({ cached_ui_state: uiState })
            .eq('id', versionId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, count: uiState.length }), { headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
})
