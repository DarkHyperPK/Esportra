import { IBracketGenerator } from './BracketGenerator';
import { BracketGraph, BracketNode, BracketEdge, BracketVersion } from '@/types/bracket-graph';

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
}

export class SingleEliminationGenerator implements IBracketGenerator {
    generate(
        teams: Team[],
        tournamentId: string,
        stageId?: string,
        bestOf: number = 1,
        bracketSize?: number,
        advancementCount?: number
    ): BracketGraph {
        const versionId = crypto.randomUUID();
        const nodes: BracketNode[] = [];
        const edges: BracketEdge[] = [];

        const numTeams = teams.length;
        // Use provided bracketSize if available, otherwise calculate based on teams
        const targetSize = bracketSize || Math.max(numTeams, 2);
        const powerOfTwo = Math.pow(2, Math.ceil(Math.log2(targetSize)));

        // Calculate rounds based on advancementCount
        // If advancementCount is set, stop when that many teams remain
        // Example: 32 teams, advance 8 → log2(32) - log2(8) = 5 - 3 = 2 rounds
        const fullRounds = Math.log2(powerOfTwo);
        const effectiveAdvCount = advancementCount && advancementCount > 0 ? advancementCount : 1;
        const targetRemainingTeams = Math.max(1, Math.pow(2, Math.ceil(Math.log2(effectiveAdvCount))));
        const numRounds = Math.max(1, fullRounds - Math.log2(targetRemainingTeams));

        const _numByes = powerOfTwo - numTeams;

        // Standard bracket seeding: 1 vs N, 2 vs N-1, etc.
        const seededTeams = this.seedTeams(teams, powerOfTwo);

        const matchMap = new Map<string, BracketNode>(); // "round-matchNum" -> Node

        // 1. Create Nodes for all rounds
        for (let r = 0; r < numRounds; r++) {
            const matchesInRound = powerOfTwo / Math.pow(2, r + 1);
            for (let i = 0; i < matchesInRound; i++) {
                const match: BracketNode = {
                    id: crypto.randomUUID(),
                    version_id: versionId,
                    round_index: r,
                    match_number: i + 1,
                    bracket_type: 'winners',
                    status: 'pending',
                    best_of: bestOf // Set best_of from stage settings
                };

                // Seed teams into Round 1
                if (r === 0) {
                    const team1Index = i * 2;
                    const team2Index = i * 2 + 1;

                    const team1 = seededTeams[team1Index];
                    const team2 = seededTeams[team2Index];

                    if (team1) {
                        match.team1_id = team1.id;
                    }
                    if (team2) {
                        match.team2_id = team2.id;
                    }

                    // BYE matches stay pending - organizer will manually advance them
                }

                nodes.push(match);
                matchMap.set(`${r}-${i + 1}`, match);
            }
        }

        // 2. Create Edges (Winner Advancement)
        for (let r = 0; r < numRounds - 1; r++) {
            const matchesInRound = powerOfTwo / Math.pow(2, r + 1);
            for (let i = 0; i < matchesInRound; i++) {
                const currentMatch = matchMap.get(`${r}-${i + 1}`);
                const nextRound = r + 1;
                const nextMatchNum = Math.ceil((i + 1) / 2);
                const nextMatch = matchMap.get(`${nextRound}-${nextMatchNum}`);

                if (currentMatch && nextMatch) {
                    const edge: BracketEdge = {
                        id: crypto.randomUUID(),
                        version_id: versionId,
                        source_match_id: currentMatch.id,
                        target_match_id: nextMatch.id,
                        type: 'winner',
                        target_slot: (i + 1) % 2 === 1 ? 1 : 2 // Odd -> Slot 1, Even -> Slot 2
                    };
                    edges.push(edge);

                    // BYE propagation happens when organizer manually advances
                }
            }
        }

        const version: BracketVersion = {
            id: versionId,
            tournament_id: tournamentId,
            stage_id: stageId,
            version_number: 1, // Will be determined by DB
            status: 'draft',
            created_at: new Date().toISOString()
        };

        return { version, nodes, edges };
    }

    /**
     * Seeds teams using standard bracket seeding:
     * For 8 teams: [1, 8, 4, 5, 2, 7, 3, 6] positions
     * This ensures top seeds are on opposite sides of the bracket
     */
    private seedTeams(teams: Team[], bracketSize: number): (Team | null)[] {
        const seeded: (Team | null)[] = new Array(bracketSize).fill(null);

        // Generate standard bracket positions
        const positions = this.generateBracketPositions(bracketSize);

        // Place teams according to their seed (index in teams array)
        for (let i = 0; i < teams.length; i++) {
            const position = positions[i];
            seeded[position] = teams[i];
        }

        return seeded;
    }

    /**
     * Generates bracket positions for standard seeding.
     * For bracketSize 8: ensures 1v8, 4v5, 2v7, 3v6 pairings
     * This uses the standard recursive algorithm that separates top seeds.
     */
    private generateBracketPositions(bracketSize: number): number[] {
        // Generate the slot order for standard seeding
        // This returns the order in which seeds should be placed
        const slots = this.getStandardBracketSlots(bracketSize);

        // Create mapping: slots[i] tells us where seed i goes
        const positions: number[] = new Array(bracketSize);
        for (let i = 0; i < bracketSize; i++) {
            positions[i] = slots[i];
        }

        return positions;
    }

    /**
     * Standard bracket slot generation using recursive halving.
     * For 8 slots: returns slot assignments ensuring:
     * - Seed 1 vs Seed 8 (slots 0,1)
     * - Seed 4 vs Seed 5 (slots 2,3)  
     * - Seed 2 vs Seed 7 (slots 6,7)
     * - Seed 3 vs Seed 6 (slots 4,5)
     */
    private getStandardBracketSlots(n: number): number[] {
        if (n === 1) return [0];
        if (n === 2) return [0, 1];

        const slots: number[] = new Array(n);
        const halfSize = n / 2;

        // Recursively get positions for the upper half of the bracket
        const upperSlots = this.getStandardBracketSlots(halfSize);

        for (let i = 0; i < halfSize; i++) {
            // Seed i+1 goes to position upperSlots[i] * 2
            slots[i] = upperSlots[i] * 2;
            // Their opponent (seed n-i) goes to the adjacent slot
            slots[n - 1 - i] = upperSlots[i] * 2 + 1;
        }

        return slots;
    }
}
