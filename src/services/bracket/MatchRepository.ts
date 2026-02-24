import { supabase } from '@/lib/supabase';
import { BracketGraph, BracketVersion, BracketNode, BracketEdge, MatchEvent } from '@/types/bracket-graph';

export class MatchRepository {
    /**
     * Persists a generated bracket graph to the database.
     * This should be done in a transaction if possible, or carefully ordered.
     */
    async createVersion(graph: BracketGraph): Promise<void> {
        const { version, nodes, edges } = graph;

        // 1. Create Version
        const { error: versionError } = await (supabase as any)
            .from('brkt_versions')
            .insert(version);
        if (versionError) throw versionError;

        // 2. Create Matches (Nodes)
        // We need to map TypeScript interface to DB columns if they differ.
        // Currently they match closely, but we need to strip undefineds or handle them.
        const dbMatches = nodes.map(n => ({
            id: n.id,
            version_id: n.version_id,
            round_index: n.round_index,
            match_number: n.match_number,
            bracket_type: n.bracket_type,
            status: n.status,
            team1_id: n.team1_id || null,
            team2_id: n.team2_id || null,
            winner_id: n.winner_id || null,
            loser_id: n.loser_id || null,
            best_of: n.best_of || 1,
            group_id: n.group_id || null, // Swiss/RR groups (Group A, B, etc.)
            round_number: n.round_number || null, // Swiss round number
        }));

        const { error: matchesError } = await (supabase as any)
            .from('brkt_matches')
            .insert(dbMatches);
        if (matchesError) throw matchesError;

        // 3. Create Advancements (Edges)
        const dbEdges = edges.map(e => ({
            id: e.id,
            version_id: e.version_id,
            source_match_id: e.source_match_id,
            target_match_id: e.target_match_id,
            type: e.type,
            target_slot: e.target_slot
        }));

        const { error: edgesError } = await (supabase as any)
            .from('brkt_advancements')
            .insert(dbEdges);
        if (edgesError) throw edgesError;

        // 4. Create Layout (if x/y exist)
        // We only insert if x/y are defined.
        const layoutItems = nodes
            .filter(n => n.x !== undefined && n.y !== undefined)
            .map(n => ({
                version_id: n.version_id,
                match_id: n.id,
                x: n.x,
                y: n.y
            }));

        if (layoutItems.length > 0) {
            const { error: layoutError } = await (supabase as any)
                .from('brkt_layout')
                .insert(layoutItems);
            if (layoutError) throw layoutError;
        }
    }

    /**
     * Appends an event to the match event log.
     */
    async addEvent(event: MatchEvent): Promise<void> {
        const { error } = await (supabase as any)
            .from('brkt_match_events')
            .insert({
                id: event.id,
                match_id: event.match_id,
                type: event.type,
                payload: event.payload,
                created_by: event.created_by,
                created_at: event.created_at
            });

        if (error) throw error;
    }

    /**
     * Fetches all events for a specific match.
     */
    async getMatchEvents(matchId: string): Promise<MatchEvent[]> {
        const { data, error } = await (supabase as any)
            .from('brkt_match_events')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as MatchEvent[]; // Cast assuming DB matches type
    }

    /**
     * Fetches the full graph structure (Version, Nodes & Edges).
     */
    async getGraphStructure(versionId: string): Promise<BracketGraph> {
        // 1. Fetch Version
        const { data: version, error: versionError } = await (supabase as any)
            .from('brkt_versions')
            .select('*')
            .eq('id', versionId)
            .single();

        if (versionError) throw versionError;

        // 2. Fetch Matches (Nodes)
        const { data: matches, error: matchesError } = await (supabase as any)
            .from('brkt_matches')
            .select(`
            *,
            layout:brkt_layout(x, y),
            team1:teams!team1_id(name, logo_url),
            team2:teams!team2_id(name, logo_url)
        `)
            .eq('version_id', versionId);

        if (matchesError) throw matchesError;

        // 3. Fetch Advancements (Edges)
        const { data: advancements, error: edgesError } = await (supabase as any)
            .from('brkt_advancements')
            .select('*')
            .eq('version_id', versionId);

        if (edgesError) throw edgesError;

        // Handle null or empty data
        if (!matches || !Array.isArray(matches)) {
            return { version, nodes: [], edges: [] };
        }

        // Map DB result to BracketNode
        const nodes: BracketNode[] = matches.map((m: any) => ({
            id: m.id,
            version_id: m.version_id,
            round_index: m.round_index,
            match_number: m.match_number,
            bracket_type: m.bracket_type,
            status: m.status,
            team1_id: m.team1_id,
            team2_id: m.team2_id,
            // Map eager loaded names/logos to node properties for immediate display
            team1_name: m.team1?.name,
            team1_logo: m.team1?.logo_url,
            team2_name: m.team2?.name,
            team2_logo: m.team2?.logo_url,
            team1_score: m.team1_score,
            team2_score: m.team2_score,
            winner_id: m.winner_id,
            loser_id: m.loser_id,
            party_code: m.party_code,
            group_id: m.group_id, // Added for RR
            round_number: m.round_number, // Added for Swiss
            y: m.layout?.[0]?.y,
            scheduled_time: m.scheduled_time,
            best_of: m.best_of,
            automated_report_status: m.automated_report_status,
            version: m.version
        }));

        // Handle null edges
        const edges: BracketEdge[] = (advancements && Array.isArray(advancements))
            ? advancements as BracketEdge[]
            : [];

        return { version, nodes, edges };
    }
}

