/**
 * BracketAdapter
 * 
 * Converts graph engine data (BracketNode[]) to legacy BracketMatch[] format
 * for use with the existing BracketVisualization component.
 * 
 * Includes structural comparison to prevent unnecessary re-renders when
 * the underlying data hasn't actually changed.
 */

import { BracketNode, BracketEdge } from '@/types/bracket-graph';
import { BracketMatch, BracketTeam, BracketSide } from '@/types/bracketTypes';

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
    seed?: number | null;
}

// Cache for structural comparison
let lastNodesHash: string | null = null;
let lastEdgesHash: string | null = null;
let lastTeamsMapHash: string | null = null;
let cachedResult: BracketMatch[] | null = null;

/**
 * Creates a hash for structural comparison of nodes
 */
function hashNodes(nodes: BracketNode[]): string {
    return nodes.map(n =>
        `${n.id}:${n.status}:${n.team1_id}:${n.team2_id}:${n.winner_id}:${n.team1_score}:${n.team2_score}:${n.party_code}:${n.team1_seed}:${n.team2_seed}`
    ).join('|');
}

/**
 * Creates a hash for structural comparison of edges
 */
function hashEdges(edges: BracketEdge[]): string {
    return edges.map(e => `${e.source_match_id}:${e.target_match_id}:${e.type}`).join('|');
}

/**
 * Creates a hash for structural comparison of teams map
 */
function hashTeamsMap(teamsMap: Map<string, Team>): string {
    const entries = Array.from(teamsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([id, t]) => `${id}:${t.name}:${t.logo_url}`).join('|');
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
function createBracketTeam(team: Team | undefined, seed: number | null): BracketTeam | null {
    if (!team) return null;
    return {
        id: team.id,
        name: team.name,
        seed: team.seed ?? seed ?? undefined,
        logo_url: team.logo_url,
        eliminated: false
    };
}

function resolveSeed(node: BracketNode, slot: 1 | 2): number | null {
    const explicitSeed = slot === 1 ? node.team1_seed : node.team2_seed;
    if (typeof explicitSeed === 'number' && Number.isFinite(explicitSeed) && explicitSeed > 0) {
        return explicitSeed;
    }

    const legacySeed = (node as any)[slot === 1 ? 'team1Seed' : 'team2Seed'];
    if (typeof legacySeed === 'number' && Number.isFinite(legacySeed) && legacySeed > 0) {
        return legacySeed;
    }

    // No fallback - return null if seed is missing
    return null;
}

/**
 * Adapts graph engine BracketNode data to legacy BracketMatch format.
 * 
 * Uses structural comparison to return cached result if data hasn't changed,
 * preventing unnecessary re-renders in React components.
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
    // Check if we can return cached result
    const nodesHash = hashNodes(nodes);
    const edgesHash = hashEdges(edges);
    const teamsHash = hashTeamsMap(teamsMap);
    
    if (
        cachedResult !== null &&
        nodesHash === lastNodesHash &&
        edgesHash === lastEdgesHash &&
        teamsHash === lastTeamsMapHash
    ) {
        return cachedResult;
    }
    
    // Update cache hashes
    lastNodesHash = nodesHash;
    lastEdgesHash = edgesHash;
    lastTeamsMapHash = teamsHash;
    
    // Compute new result
    const result = nodes.map(node => {
        // Look up team details (Map takes precedence as it might be fresher, but fallback to eager loaded data)
        const mapTeam1 = node.team1_id ? teamsMap.get(node.team1_id) : undefined;
        const mapTeam2 = node.team2_id ? teamsMap.get(node.team2_id) : undefined;
        // Winner usually doesn't have eager loaded data on the match itself unless we join differently, 
        // but for now map lookup is fine for winner.
        const winner = node.winner_id ? teamsMap.get(node.winner_id) : undefined;

        const team1: Team | undefined = mapTeam1 || (node.team1_id ? { id: node.team1_id, name: (node as any).team1_name || 'TBD', logo_url: (node as any).team1_logo } : undefined);
        const team2: Team | undefined = mapTeam2 || (node.team2_id ? { id: node.team2_id, name: (node as any).team2_name || 'TBD', logo_url: (node as any).team2_logo } : undefined);
        const team1Seed = resolveSeed(node, 1);
        const team2Seed = resolveSeed(node, 2);

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
            team1: createBracketTeam(team1, team1Seed),
            team2: createBracketTeam(team2, team2Seed),
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
    
    // Cache and return result
    cachedResult = result;
    return result;
}

/**
 * Builds a competitor map from bracket graph nodes (team or solo participant slots).
 * Prefer this over /api/teams lookups — bracket slots may hold participant UUIDs.
 */
export function buildCompetitorMapFromNodes(nodes: BracketNode[]): Map<string, Team> {
    const map = new Map<string, Team>();

    const add = (id?: string | null, name?: string | null, logo?: string | null) => {
        if (!id) return;
        const existing = map.get(id);
        // Never clobber a resolved name with TBD (winner/loser ids reuse slot ids)
        const resolvedName = name?.trim() || existing?.name || 'TBD';
        map.set(id, {
            id,
            name: resolvedName,
            logo_url: logo ?? existing?.logo_url ?? null,
        });
    };

    nodes.forEach((node) => {
        const n = node as BracketNode & {
            team1_name?: string | null;
            team2_name?: string | null;
            team1_logo?: string | null;
            team2_logo?: string | null;
        };
        add(node.team1_id, n.team1_name, n.team1_logo);
        add(node.team2_id, n.team2_name, n.team2_logo);

        if (node.winner_id) {
            const winnerName =
                node.winner_id === node.team1_id ? n.team1_name
                : node.winner_id === node.team2_id ? n.team2_name
                : null;
            const winnerLogo =
                node.winner_id === node.team1_id ? n.team1_logo
                : node.winner_id === node.team2_id ? n.team2_logo
                : null;
            add(node.winner_id, winnerName, winnerLogo);
        }

        if (node.loser_id) {
            const loserName =
                node.loser_id === node.team1_id ? n.team1_name
                : node.loser_id === node.team2_id ? n.team2_name
                : null;
            const loserLogo =
                node.loser_id === node.team1_id ? n.team1_logo
                : node.loser_id === node.team2_id ? n.team2_logo
                : null;
            add(node.loser_id, loserName, loserLogo);
        }
    });

    return map;
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
