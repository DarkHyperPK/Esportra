import { BracketNode, BracketEdge } from '@/types/bracket-graph';

/**
 * Pure functions to generate optimistic bracket states.
 * Used to update the UI instantly before backend operations complete.
 */

export const optimisticBracket = {
    /**
     * Apply a score and immediately determine the winner.
     */
    applyScore(
        nodes: BracketNode[],
        matchId: string,
        team1Score: number,
        team2Score: number,
        team1Id: string | null,
        team2Id: string | null
    ): BracketNode[] {
        // Find winner based on higher score
        const winnerId = team1Score > team2Score ? team1Id : team2Id;
        const loserId = team1Score > team2Score ? team2Id : team1Id;

        return nodes.map((node) => {
            // Stringify IDs for comparison
            if (String(node.id) === String(matchId)) {
                return {
                    ...node,
                    team1_score: team1Score,
                    team2_score: team2Score,
                    winner_id: winnerId,
                    loser_id: loserId,
                    status: 'completed',
                };
            }
            return node;
        });
    },

    /**
     * Propagate a winner/loser to their next matches based on edges.
     */
    applyAdvancement(
        nodes: BracketNode[],
        edges: BracketEdge[],
        sourceMatchId: string,
        winnerId?: string | null,
        loserId?: string | null
    ): BracketNode[] {
        let nextNodes = [...nodes];

        // Find advancement edges
        const winnerEdge = edges.find(
            (e) => String(e.source_match_id) === String(sourceMatchId) && e.type === 'winner'
        );
        const loserEdge = edges.find(
            (e) => String(e.source_match_id) === String(sourceMatchId) && e.type === 'loser'
        );

        // Advance Winner
        if (winnerId && winnerEdge) {
            nextNodes = nextNodes.map((node) => {
                if (String(node.id) === String(winnerEdge.target_match_id)) {
                    const field = winnerEdge.target_slot === 1 ? 'team1_id' : 'team2_id';

                    const sourceMatch = nodes.find(n => String(n.id) === String(sourceMatchId));
                    const teamName = sourceMatch?.team1_id === winnerId ? sourceMatch.team1_name : sourceMatch?.team2_id === winnerId ? sourceMatch.team2_name : null;
                    const teamLogo = sourceMatch?.team1_id === winnerId ? sourceMatch.team1_logo : sourceMatch?.team2_id === winnerId ? sourceMatch.team2_logo : null;

                    const nameField = winnerEdge.target_slot === 1 ? 'team1_name' : 'team2_name';
                    const logoField = winnerEdge.target_slot === 1 ? 'team1_logo' : 'team2_logo';

                    const newStatus = (node.status === 'in_progress' || node.status === 'completed' || node.status === 'disputed')
                        ? node.status
                        : 'pending';

                    return {
                        ...node,
                        [field]: winnerId,
                        ...(teamName ? { [nameField]: teamName } : {}),
                        ...(teamLogo ? { [logoField]: teamLogo } : {}),
                        status: newStatus
                    };
                }
                return node;
            });
        }

        // Advance Loser
        if (loserId && loserEdge) {
            nextNodes = nextNodes.map((node) => {
                if (String(node.id) === String(loserEdge.target_match_id)) {
                    const field = loserEdge.target_slot === 1 ? 'team1_id' : 'team2_id';

                    const sourceMatch = nodes.find(n => String(n.id) === String(sourceMatchId));
                    const teamName = sourceMatch?.team1_id === loserId ? sourceMatch.team1_name : sourceMatch?.team2_id === loserId ? sourceMatch.team2_name : null;
                    const teamLogo = sourceMatch?.team1_id === loserId ? sourceMatch.team1_logo : sourceMatch?.team2_id === loserId ? sourceMatch.team2_logo : null;

                    const nameField = loserEdge.target_slot === 1 ? 'team1_name' : 'team2_name';
                    const logoField = loserEdge.target_slot === 1 ? 'team1_logo' : 'team2_logo';

                    const newStatus = (node.status === 'in_progress' || node.status === 'completed' || node.status === 'disputed')
                        ? node.status
                        : 'pending';

                    return {
                        ...node,
                        [field]: loserId,
                        ...(teamName ? { [nameField]: teamName } : {}),
                        ...(teamLogo ? { [logoField]: teamLogo } : {}),
                        status: newStatus
                    };
                }
                return node;
            });
        }

        return nextNodes;
    },

    /**
     * Swap Team 1 and Team 2 in a given match.
     */
    applySwap(nodes: BracketNode[], matchId: string): BracketNode[] {
        return nodes.map((node) => {
            if (String(node.id) === String(matchId)) {
                return {
                    ...node,
                    team1_id: node.team2_id,
                    team2_id: node.team1_id,
                    team1_score: node.team2_score,
                    team2_score: node.team1_score,
                    team1_name: node.team2_name,
                    team2_name: node.team1_name,
                    team1_logo: node.team2_logo,
                    team2_logo: node.team1_logo
                };
            }
            return node;
        });
    },

    /**
     * Reset a match to its pending state, removing scores.
     * Note: A true robust reset also needs to undo advancement, but optimistic UI 
     * usually just focuses on the immediate visual (the match itself).
     */
    applyReset(nodes: BracketNode[], matchId: string): BracketNode[] {
        return nodes.map((node) => {
            if (String(node.id) === String(matchId)) {
                return {
                    ...node,
                    status: 'pending',
                    team1_score: 0,
                    team2_score: 0,
                    winner_id: null,
                    loser_id: null,
                };
            }
            return node;
        });
    }
};
