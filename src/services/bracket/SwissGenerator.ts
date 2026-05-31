import { BracketGraph, BracketNode, BracketEdge, BracketVersion } from '@/types/bracket-graph';
import { IBracketGenerator } from './BracketGenerator';
import { apiClient } from '@/lib/apiClient';

export class SwissGenerator implements IBracketGenerator {
    /**
     * Generates the initial Swiss bracket (Round 1)
     */
    generate(
        teams: any[],
        tournamentId: string,
        stageId?: string,
        bestOf: number = 1,
        bracketSize?: number, // Interpreted as "Total Rounds" for Swiss
        advancementCount?: number,
        config?: any
    ): BracketGraph {
        const versionId = crypto.randomUUID();
        const nodes: BracketNode[] = [];
        const edges: BracketEdge[] = [];

        console.log('[SwissGenerator] Config received:', config);
        const swissGroups = config?.swiss_groups || 1;
        const totalRounds = bracketSize || config?.swiss_rounds || 1;
        console.log('[SwissGenerator] Using swissGroups:', swissGroups, 'totalRounds:', totalRounds);
        console.log('[SwissGenerator] Total teams:', teams.length);

        // 1. Sort teams by seed initially
        const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));

        // 2. Split into groups if needed
        const groups: any[][] = [];
        if (swissGroups > 1) {
            // Snake draft distribution for balance? Or just sequential?
            // Sequential is easier for "Top seeds in Group A".
            // Snake is better for balance. Let's do Snake.
            for (let i = 0; i < swissGroups; i++) groups.push([]);

            sortedTeams.forEach((team, index) => {
                const groupIndex = index % swissGroups;
                // Snake: if row is odd, reverse direction? 
                // Simple modulo is fine for now, effectively distributes seeds 1, 2, 3, 4 -> A, B, C, D
                groups[groupIndex].push(team);
            });

            console.log('[SwissGenerator] Group distribution:');
            groups.forEach((g, i) => console.log(`  Group ${String.fromCharCode(65 + i)}: ${g.length} teams`));
        } else {
            groups.push(sortedTeams);
            console.log('[SwissGenerator] Single group with all', sortedTeams.length, 'teams');
        }

        let matchCounter = 1;

        groups.forEach((groupTeams, groupIndex) => {
            const groupId = swissGroups > 1 ? `Group ${String.fromCharCode(65 + groupIndex)}` : null; // Group A, B, C...
            console.log('[SwissGenerator] Creating matches for:', groupId || 'Single Group', '- Teams:', groupTeams.length);

            // Generate Round 1 for this group
            // Standard Swiss uses "Slide" (1 vs N/2 + 1)
            const half = Math.ceil(groupTeams.length / 2);
            const topHalf = groupTeams.slice(0, half);
            const bottomHalf = groupTeams.slice(half);

            for (let i = 0; i < topHalf.length; i++) {
                const team1 = topHalf[i];
                const team2 = bottomHalf[i]; // Might be undefined if odd number

                const matchId = crypto.randomUUID();

                // Handle BYE for odd number
                if (!team2) {
                    nodes.push({
                        id: matchId,
                        version_id: versionId,
                        round_index: 0,
                        match_number: matchCounter++,
                        bracket_type: 'swiss_round',
                        round_number: 1,
                        status: 'pending', // Allow manual advancement
                        team1_id: team1.id,
                        winner_id: null, // Winner determined on advancement
                        best_of: bestOf,
                        group_id: groupId
                    });
                } else {
                    nodes.push({
                        id: matchId,
                        version_id: versionId,
                        round_index: 0,
                        match_number: matchCounter++,
                        bracket_type: 'swiss_round',
                        round_number: 1,
                        status: 'pending',
                        team1_id: team1.id,
                        team2_id: team2.id,
                        best_of: bestOf,
                        group_id: groupId
                    });
                }
            }
        });

        const version: BracketVersion = {
            id: versionId,
            tournament_id: tournamentId,
            stage_id: stageId,
            version_number: 1,
            status: 'draft',
            created_at: new Date().toISOString()
        };

        return { version, nodes, edges };
    }

    /**
     * Generates the next round of matches for an existing Swiss bracket.
     * Delegates to POST /api/swiss/next-round on the .NET API.
     */
    static async generateNextRound(stageId: string, versionId: string, currentRound: number): Promise<{ success: boolean; message?: string }> {
        try {
            await apiClient.post('/api/swiss/next-round', {
                stageId,
                versionId,
                currentRound
            });
            return { success: true };
        } catch (e: any) {
            console.error('[SwissGenerator] Error generating next round:', e);
            return { success: false, message: e.message };
        }
    }

    /**
     * Deletes the latest round of matches for a stage.
     * Delegates to DELETE on the .NET API.
     */
    static async deleteRound(stageId: string, roundNumber: number): Promise<{ success: boolean; message?: string }> {
        try {
            await apiClient.delete(`/api/swiss/${stageId}/round/${roundNumber}`);
            return { success: true };
        } catch (e: any) {
            console.error('[SwissGenerator] Error deleting round:', e);
            return { success: false, message: e.message };
        }
    }
}
