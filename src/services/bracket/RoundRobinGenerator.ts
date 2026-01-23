import { BracketGraph, BracketNode, BracketEdge, BracketVersion } from '@/types/bracket-graph';
import { IBracketGenerator } from './BracketGenerator';

export class RoundRobinGenerator implements IBracketGenerator {
    generate(
        teams: any[],
        tournamentId: string,
        stageId?: string,
        bestOf: number = 1,
        bracketSize?: number, // Interpreted as "Number of Groups" for RR
        advancementCount?: number
    ): BracketGraph {
        const versionId = crypto.randomUUID();
        const nodes: BracketNode[] = [];
        const edges: BracketEdge[] = [];

        // 1. Determine Groups
        const numGroups = bracketSize || 1;
        const groups: any[][] = Array.from({ length: numGroups }, () => []);

        // Snake Seeding Distribution
        // 1, 8, 9, 16 -> Group A
        // 2, 7, 10, 15 -> Group B
        // ...
        teams.forEach((team, index) => {
            const cycle = Math.floor(index / numGroups);
            let groupIndex;

            if (cycle % 2 === 0) {
                // Forward: 0, 1, 2, 3
                groupIndex = index % numGroups;
            } else {
                // Backward: 3, 2, 1, 0
                groupIndex = numGroups - 1 - (index % numGroups);
            }

            groups[groupIndex].push(team);
        });

        // 2. Generate Matches for each Group
        let matchCounter = 1;

        groups.forEach((groupTeams, groupIdx) => {
            const groupId = `Group ${String.fromCharCode(65 + groupIdx)}`; // Group A, B, C...

            // Round Robin Algorithm (Circle Method or simple iteration)
            // For small groups (e.g. 4), simple iteration is fine.
            for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                    const team1 = groupTeams[i];
                    const team2 = groupTeams[j];

                    const matchId = crypto.randomUUID();

                    nodes.push({
                        id: matchId,
                        version_id: versionId,
                        round_index: 0, // All RR matches are conceptually "Round 1" or we can stagger them
                        match_number: matchCounter++,
                        bracket_type: 'group',
                        group_id: groupId,
                        round_number: 1, // Can be refined to actual rounds if we implement scheduling
                        status: 'pending',
                        team1_id: team1.id,
                        team2_id: team2.id,
                        best_of: bestOf,
                        // Layout hints (simple grid)
                        x: groupIdx * 400,
                        y: (nodes.length % 10) * 150
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
}
