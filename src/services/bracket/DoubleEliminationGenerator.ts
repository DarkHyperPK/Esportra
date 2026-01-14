import { IBracketGenerator } from './BracketGenerator';
import { BracketGraph, BracketNode, BracketEdge, BracketVersion } from '@/types/bracket-graph';

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
}

export class DoubleEliminationGenerator implements IBracketGenerator {
    generate(teams: Team[], tournamentId: string, stageId?: string, bestOf: number = 3, bracketSize?: number): BracketGraph {
        const versionId = crypto.randomUUID();
        const nodes: BracketNode[] = [];
        const edges: BracketEdge[] = [];

        const numTeams = teams.length;
        // Use provided bracketSize if available, otherwise calculate based on teams
        const targetSize = bracketSize || numTeams || 2;
        const P = Math.pow(2, Math.ceil(Math.log2(targetSize)));
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

                    // Handle BYEs
                    if (match.team1_id && !match.team2_id) {
                        match.winner_id = match.team1_id;
                        match.loser_id = undefined;
                        match.status = 'completed';
                    } else if (!match.team1_id && match.team2_id) {
                        match.winner_id = match.team2_id;
                        match.loser_id = undefined;
                        match.status = 'completed';
                    }
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

                    // Propagate BYE winners
                    if (current.winner_id) {
                        const slot = (i + 1) % 2 === 1 ? 1 : 2;
                        if (slot === 1) {
                            nextMatch.team1_id = current.winner_id;
                        } else {
                            nextMatch.team2_id = current.winner_id;
                        }
                    }
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
