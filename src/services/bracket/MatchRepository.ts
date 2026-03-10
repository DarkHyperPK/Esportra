import { apiClient } from '@/lib/apiClient';
import { BracketGraph, BracketVersion, BracketNode, BracketEdge, MatchEvent } from '@/types/bracket-graph';

export class MatchRepository {
    /**
     * Persists a generated bracket graph to the database.
     * Now delegates to POST /api/brackets/generate on the .NET API.
     * For legacy client-side generation, we still accept the full graph
     * and POST the raw structure for server-side persistence.
     */
    async createVersion(graph: BracketGraph): Promise<void> {
        // The backend POST /api/brackets/generate handles persistence via BracketPersistenceService.
        // For client-side generated graphs, we post the raw graph for persistence.
        await apiClient.post('/api/brackets/persist', graph);
    }

    /**
     * Appends an event to the match event log.
     */
    async addEvent(event: MatchEvent): Promise<void> {
        await apiClient.post(`/api/brackets/events`, {
            id: event.id,
            matchId: event.match_id,
            type: event.type,
            payload: event.payload,
            createdBy: event.created_by,
            createdAt: event.created_at
        });
    }

    /**
     * Fetches all events for a specific match.
     */
    async getMatchEvents(matchId: string): Promise<MatchEvent[]> {
        return apiClient.get(`/api/brackets/events/${matchId}`);
    }

    /**
     * Fetches the full graph structure (Version, Nodes & Edges).
     */
    async getGraphStructure(versionId: string): Promise<BracketGraph> {
        const data = await apiClient.get(`/api/brackets/${versionId}/graph`);

        const { version, nodes: rawNodes, edges: rawEdges } = data;

        // Handle null or empty data
        if (!rawNodes || !Array.isArray(rawNodes)) {
            return { version, nodes: [], edges: [] };
        }

        // Map DB result to BracketNode
        const nodes: BracketNode[] = rawNodes.map((m: any) => ({
            id: m.id,
            version_id: m.version_id,
            round_index: m.round_index,
            match_number: m.match_number,
            bracket_type: m.bracket_type,
            status: m.status,
            team1_id: m.team1_id,
            team2_id: m.team2_id,
            team1_name: m.team1_name,
            team1_logo: m.team1_logo,
            team2_name: m.team2_name,
            team2_logo: m.team2_logo,
            team1_score: m.team1_score,
            team2_score: m.team2_score,
            winner_id: m.winner_id,
            loser_id: m.loser_id,
            party_code: m.party_code,
            group_id: m.group_id,
            round_number: m.round_number,
            y: m.y,
            scheduled_time: m.scheduled_time,
            best_of: m.best_of,
            automated_report_status: m.automated_report_status,
            version: m.version
        }));

        // Handle null edges
        const edges: BracketEdge[] = (rawEdges && Array.isArray(rawEdges))
            ? rawEdges as BracketEdge[]
            : [];

        return { version, nodes, edges };
    }
}

