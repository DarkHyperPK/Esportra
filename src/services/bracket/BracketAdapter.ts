/**
 * BracketAdapter
 * 
 * Converts graph engine data (BracketNode[]) to legacy BracketMatch[] format
 * for use with the existing BracketVisualization component.
 */

import { BracketNode, BracketEdge } from '@/types/bracket-graph';
import { BracketMatch, BracketTeam, BracketSide } from '@/types/bracketTypes';

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
}

/**
 * Maps bracket_type to BracketSide
 */
function mapBracketType(bracketType: string): BracketSide | undefined {
    switch (bracketType) {
        case 'winners':
            return 'winners';
        case 'losers':
            return 'losers';
        case 'final':
            return 'final';
        default:
            return undefined;
    }
}

/**
 * Creates a BracketTeam from Team data
 */
function createBracketTeam(team: Team | undefined, seed: number): BracketTeam | null {
    if (!team) return null;
    return {
        id: team.id,
        name: team.name,
        seed,
        logo_url: team.logo_url,
        eliminated: false
    };
}

/**
 * Adapts graph engine BracketNode data to legacy BracketMatch format.
 * 
 * @param nodes - Array of BracketNode from graph engine
 * @param edges - Array of BracketEdge for advancement relationships
 * @param teamsMap - Map of team_id to Team object for looking up team details
 * @returns Array of BracketMatch for use with BracketVisualization component
 */
export function adaptGraphToBracketMatches(
    nodes: BracketNode[],
    edges: BracketEdge[],
    teamsMap: Map<string, Team>
): BracketMatch[] {
    return nodes.map(node => {
        // Look up team details (Map takes precedence as it might be fresher, but fallback to eager loaded data)
        const mapTeam1 = node.team1_id ? teamsMap.get(node.team1_id) : undefined;
        const mapTeam2 = node.team2_id ? teamsMap.get(node.team2_id) : undefined;
        // Winner usually doesn't have eager loaded data on the match itself unless we join differently, 
        // but for now map lookup is fine for winner.
        const winner = node.winner_id ? teamsMap.get(node.winner_id) : undefined;

        const team1 = mapTeam1 || (node.team1_id ? { id: node.team1_id, name: node.team1_name || 'TBD', logo_url: node.team1_logo } : undefined);
        const team2 = mapTeam2 || (node.team2_id ? { id: node.team2_id, name: node.team2_name || 'TBD', logo_url: node.team2_logo } : undefined);

        // Find next match from edges (winner advancement)
        const winnerEdge = edges.find(e =>
            e.source_match_id === node.id && e.type === 'winner'
        );

        // Find loser next match (for double elimination)
        const loserEdge = edges.find(e =>
            e.source_match_id === node.id && e.type === 'loser'
        );

        // Map status
        let status: BracketMatch['status'] = 'pending';
        if (node.status === 'in_progress') status = 'in_progress';
        else if (node.status === 'completed') status = 'completed';
        else if (node.status === 'disputed') status = 'disputed';

        // Add 'db-' prefix so legacy BracketVisualization recognizes as database match
        const bracketMatch: BracketMatch = {
            id: `db-${node.id}`,
            round: node.round_index + 1, // Convert 0-indexed to 1-indexed
            matchNumber: node.match_number,
            team1: createBracketTeam(team1, node.match_number * 2 - 1),
            team2: createBracketTeam(team2, node.match_number * 2),
            winner: createBracketTeam(winner, 0),
            score: null, // We use individual scores instead
            team1_score: (node as any).team1_score ?? null,
            team2_score: (node as any).team2_score ?? null,
            status,
            scheduledTime: (node as any).scheduled_time,
            bestOf: (node as any).best_of,
            partyCode: (node as any).party_code,
            bracketSide: mapBracketType(node.bracket_type),
            bracketType: node.bracket_type,
            nextMatchId: winnerEdge ? `db-${winnerEdge.target_match_id}` : null,
            loserNextMatchId: loserEdge ? `db-${loserEdge.target_match_id}` : null,
            stageId: node.version_id, // Use version_id as stage reference
            groupId: (node as any).group_id, // Map group_id for Swiss/Group stages
            x: node.x,
            y: node.y
        };

        return bracketMatch;
    });
}

/**
 * Extracts all unique team IDs from bracket nodes
 */
export function extractTeamIds(nodes: BracketNode[]): string[] {
    const ids = new Set<string>();
    nodes.forEach(node => {
        if (node.team1_id) ids.add(node.team1_id);
        if (node.team2_id) ids.add(node.team2_id);
        if (node.winner_id) ids.add(node.winner_id);
        if (node.loser_id) ids.add(node.loser_id);
    });
    return Array.from(ids);
}
