import { IBracketGenerator } from './BracketGenerator';
import { BracketGraph, BracketNode, BracketEdge, BracketVersion } from '@/types/bracket-graph';

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
}

export class DoubleEliminationGenerator implements IBracketGenerator {
    generate(
        teams: Team[],
        tournamentId: string,
        stageId?: string,
        bestOf: number = 3,
        bracketSize?: number,
        advancementCount?: number
    ): BracketGraph {
        const versionId = crypto.randomUUID();
        const nodes: BracketNode[] = [];
        const edges: BracketEdge[] = [];

        const numTeams = teams.length;
        // Use provided bracketSize if available, otherwise calculate based on teams
        const targetSize = bracketSize || numTeams || 2;
        const P = Math.pow(2, Math.ceil(Math.log2(targetSize)));

        // Calculate rounds based on bracket size
        // We ALWAYS generate a full bracket regardless of advancementCount
        // Advancement is handled by post-stage placement logic, not by truncating the bracket
        const numUpperRounds = Math.log2(P);
        const numLowerRounds = 2 * numUpperRounds - 2;

        // Standard bracket seeding
        const seededTeams = this.seedTeams(teams, P);

        const matchMap = new Map<string, BracketNode>();

        // 1. Upper Bracket Nodes
        for (let r = 0; r < numUpperRounds; r++) {
            const matchesInRound = P / Math.pow(2, r + 1);
            for (let i = 0; i < matchesInRound; i++) {
                const match: BracketNode = {
                    id: crypto.randomUUID(),
                    version_id: versionId,
                    round_index: r,
                    match_number: i + 1,
                    bracket_type: 'winners',
                    status: 'pending',
                    best_of: bestOf
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
                matchMap.set(`winners-${r}-${i + 1}`, match);
            }
        }

        // 2. Lower Bracket Nodes
        for (let r = 0; r < numLowerRounds; r++) {
            const matchesInRound = Math.pow(2, Math.floor((numLowerRounds - 1 - r) / 2));
            for (let i = 0; i < matchesInRound; i++) {
                const match: BracketNode = {
                    id: crypto.randomUUID(),
                    version_id: versionId,
                    round_index: r,
                    match_number: i + 1,
                    bracket_type: 'losers',
                    status: 'pending',
                    best_of: bestOf
                };
                nodes.push(match);
                matchMap.set(`losers-${r}-${i + 1}`, match);
            }
        }

        // 3. Grand Final Node
        const gfMatch: BracketNode = {
            id: crypto.randomUUID(),
            version_id: versionId,
            round_index: numUpperRounds,
            match_number: 1,
            bracket_type: 'final',
            status: 'pending',
            best_of: bestOf
        };
        nodes.push(gfMatch);
        matchMap.set('final-0-1', gfMatch);

        // 4. Upper Bracket Edges (Winner Advancement & Loser Drops)
        for (let r = 0; r < numUpperRounds - 1; r++) {
            const matchesInRound = P / Math.pow(2, r + 1);
            for (let i = 0; i < matchesInRound; i++) {
                const current = matchMap.get(`winners-${r}-${i + 1}`);

                // Winner -> Next WB Round
                const nextMatchNum = Math.ceil((i + 1) / 2);
                const nextMatch = matchMap.get(`winners-${r + 1}-${nextMatchNum}`);

                if (current && nextMatch) {
                    edges.push({
                        id: crypto.randomUUID(),
                        version_id: versionId,
                        source_match_id: current.id,
                        target_match_id: nextMatch.id,
                        type: 'winner',
                        target_slot: (i + 1) % 2 === 1 ? 1 : 2
                    });

                    // BYE propagation happens when organizer manually advances
                }

                // Loser -> Drop to LB
                const lr = r === 0 ? 0 : (2 * r - 1);

                if (lr < numLowerRounds) {
                    const dropMatchNum = (r === 0) ? Math.ceil((i + 1) / 2) : (i + 1);
                    const loserMatch = matchMap.get(`losers-${lr}-${dropMatchNum}`);

                    if (current && loserMatch) {
                        const slot = (r === 0) ? ((i + 1) % 2 === 1 ? 1 : 2) : 1;

                        edges.push({
                            id: crypto.randomUUID(),
                            version_id: versionId,
                            source_match_id: current.id,
                            target_match_id: loserMatch.id,
                            type: 'loser',
                            target_slot: slot as 1 | 2
                        });
                    }
                }
            }
        }

        // Upper Final -> GF
        const upperFinal = matchMap.get(`winners-${numUpperRounds - 1}-1`);
        if (upperFinal) {
            edges.push({
                id: crypto.randomUUID(),
                version_id: versionId,
                source_match_id: upperFinal.id,
                target_match_id: gfMatch.id,
                type: 'winner',
                target_slot: 1
            });

            // Loser -> LB Final
            const lbFinal = matchMap.get(`losers-${numLowerRounds - 1}-1`);
            if (lbFinal) {
                edges.push({
                    id: crypto.randomUUID(),
                    version_id: versionId,
                    source_match_id: upperFinal.id,
                    target_match_id: lbFinal.id,
                    type: 'loser',
                    target_slot: 1
                });
            }
        }

        // 5. Lower Bracket Edges
        for (let r = 0; r < numLowerRounds - 1; r++) {
            const matchesInRound = Math.pow(2, Math.floor((numLowerRounds - 1 - r) / 2));
            for (let i = 0; i < matchesInRound; i++) {
                const current = matchMap.get(`losers-${r}-${i + 1}`);

                const nextMatchNum = (r % 2 === 0) ? (i + 1) : Math.ceil((i + 1) / 2);
                const nextMatch = matchMap.get(`losers-${r + 1}-${nextMatchNum}`);

                if (current && nextMatch) {
                    const slot = (r % 2 === 0) ? 2 : ((i + 1) % 2 === 1 ? 1 : 2);

                    edges.push({
                        id: crypto.randomUUID(),
                        version_id: versionId,
                        source_match_id: current.id,
                        target_match_id: nextMatch.id,
                        type: 'winner',
                        target_slot: slot as 1 | 2
                    });
                }
            }
        }

        // Lower Final -> GF Slot 2
        const lowerFinal = matchMap.get(`losers-${numLowerRounds - 1}-1`);
        if (lowerFinal) {
            edges.push({
                id: crypto.randomUUID(),
                version_id: versionId,
                source_match_id: lowerFinal.id,
                target_match_id: gfMatch.id,
                type: 'winner',
                target_slot: 2
            });
        }

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
     * Seeds teams using standard bracket seeding
     */
    private seedTeams(teams: Team[], bracketSize: number): (Team | null)[] {
        const seeded: (Team | null)[] = new Array(bracketSize).fill(null);
        const positions = this.generateBracketPositions(bracketSize);

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
