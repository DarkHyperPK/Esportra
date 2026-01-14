import { IBracketGenerator, GraphValidator } from './BracketGenerator';
import { BracketGraph, BracketNode, BracketEdge, BracketVersion } from '@/types/bracket-graph';

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
}

export class SingleEliminationGenerator implements IBracketGenerator {
    generate(teams: Team[], tournamentId: string, stageId?: string, bestOf: number = 3, bracketSize?: number): BracketGraph {
        const versionId = crypto.randomUUID();
        const nodes: BracketNode[] = [];
        const edges: BracketEdge[] = [];

        const numTeams = teams.length;
        // Use provided bracketSize if available, otherwise calculate based on teams
        const targetSize = bracketSize || numTeams || 2;
        const powerOfTwo = Math.pow(2, Math.ceil(Math.log2(targetSize)));
        const numRounds = Math.log2(powerOfTwo);
        const numByes = powerOfTwo - numTeams;

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

                    // Handle BYEs - if one team is missing, auto-advance the other
                    if (match.team1_id && !match.team2_id) {
                        match.winner_id = match.team1_id;
                        match.status = 'completed';
                    } else if (!match.team1_id && match.team2_id) {
                        match.winner_id = match.team2_id;
                        match.status = 'completed';
                    }
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

                    // If source match has a winner (BYE), propagate to next match
                    if (currentMatch.winner_id) {
                        if (edge.target_slot === 1) {
                            nextMatch.team1_id = currentMatch.winner_id;
                        } else {
                            nextMatch.team2_id = currentMatch.winner_id;
                        }
                    }
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
     * For bracketSize 8: returns [0, 7, 3, 4, 1, 6, 2, 5]
     * Meaning: Seed 1 -> position 0, Seed 2 -> position 7, etc.
     */
    private generateBracketPositions(bracketSize: number): number[] {
        if (bracketSize === 1) return [0];
        if (bracketSize === 2) return [0, 1];

        const half = bracketSize / 2;
        const topHalf = this.generateBracketPositions(half);

        const positions: number[] = [];
        for (let i = 0; i < topHalf.length; i++) {
            positions.push(topHalf[i] * 2);
            positions.push((half - 1 - topHalf[i]) * 2 + 1);
        }

        return positions;
    }
}
