import { BracketGraph, BracketNode, BracketEdge, BracketVersion } from '@/types/bracket-graph';
import { IBracketGenerator } from './BracketGenerator';

/**
 * Round Robin Generator using Circle Algorithm
 * 
 * Creates (N-1) rounds where each team plays exactly once per round.
 * This ensures proper match ordering for captain's match room.
 */
export class RoundRobinGenerator implements IBracketGenerator {
    generate(
        teams: any[],
        tournamentId: string,
        stageId?: string,
        bestOf: number = 1,
        bracketSize?: number, // Interpreted as "Number of Groups" for RR
        advancementCount?: number,
        config?: any
    ): BracketGraph {
        const versionId = crypto.randomUUID();
        const nodes: BracketNode[] = [];
        const edges: BracketEdge[] = [];

        // Extract scheduling config for auto-scheduling
        const dailyStartTime = config?.daily_start_time || '20:00';
        const tournamentStartDate = config?.tournament_start_date ? new Date(config.tournament_start_date) : null;

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

        // 2. Generate Matches for each Group using Circle Algorithm
        let matchCounter = 1;

        groups.forEach((groupTeams, groupIdx) => {
            const groupId = `Group ${String.fromCharCode(65 + groupIdx)}`; // Group A, B, C...

            // Generate matches using Circle Algorithm for proper round assignment
            const roundMatches = this.generateCircleSchedule(groupTeams);

            roundMatches.forEach((round, roundIdx) => {
                // Auto-schedule: Calculate scheduled time for this round's day
                let scheduledTime: string | undefined;
                if (tournamentStartDate) {
                    const roundDate = new Date(tournamentStartDate);
                    roundDate.setDate(roundDate.getDate() + roundIdx); // Day 1 = round 0, Day 2 = round 1, etc.
                    const [hours, minutes] = dailyStartTime.split(':').map(Number);
                    roundDate.setHours(hours, minutes, 0, 0);
                    scheduledTime = roundDate.toISOString();
                }

                round.forEach(matchup => {
                    const matchId = crypto.randomUUID();

                    nodes.push({
                        id: matchId,
                        version_id: versionId,
                        round_index: roundIdx, // Proper round index (0-based)
                        match_number: matchCounter++,
                        bracket_type: 'group',
                        group_id: groupId,
                        round_number: roundIdx + 1, // Human-readable round (1-based)
                        status: 'pending',
                        team1_id: matchup.team1.id,
                        team2_id: matchup.team2.id,
                        best_of: bestOf,
                        scheduled_time: scheduledTime, // Auto-scheduled based on day
                        // Layout hints (grid by group and round)
                        x: groupIdx * 400,
                        y: roundIdx * 150 + (round.indexOf(matchup) * 80)
                    });
                });
            });
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
     * Circle Algorithm for Round Robin Scheduling
     * 
     * For N teams, creates (N-1) rounds where each team plays exactly once per round.
     * If odd number of teams, adds a "BYE" placeholder.
     * 
     * Algorithm:
     * 1. Fix team at position 0 (anchor)
     * 2. Rotate all other teams clockwise each round
     * 3. Pair teams at opposite positions in the circle
     * 
     * Example for 4 teams [A, B, C, D]:
     * Round 1: A-D, B-C (positions: 0-3, 1-2)
     * Round 2: A-C, D-B (rotate: [A, D, B, C] -> positions: 0-3, 1-2)
     * Round 3: A-B, C-D (rotate: [A, C, D, B] -> positions: 0-3, 1-2)
     */
    private generateCircleSchedule(teams: any[]): Array<Array<{ team1: any; team2: any }>> {
        const rounds: Array<Array<{ team1: any; team2: any }>> = [];

        // Handle edge cases
        if (teams.length < 2) {
            return rounds; // No matches possible
        }

        // Copy teams array to avoid mutation
        let participants = [...teams];

        // If odd number of teams, add a BYE placeholder
        const hasBye = participants.length % 2 !== 0;
        if (hasBye) {
            participants.push({ id: null, name: 'BYE', isBye: true });
        }

        const n = participants.length;
        const numRounds = n - 1; // For N teams, N-1 rounds

        // Create initial circle arrangement
        // Position 0 is fixed (anchor), positions 1 to n-1 rotate
        let circle = [...participants];

        for (let round = 0; round < numRounds; round++) {
            const roundMatches: Array<{ team1: any; team2: any }> = [];

            // Pair teams at opposite positions
            // Position i pairs with position (n-1-i)
            for (let i = 0; i < n / 2; i++) {
                const team1 = circle[i];
                const team2 = circle[n - 1 - i];

                // Skip BYE matches (but could include them if needed for tracking)
                if (team1.isBye || team2.isBye) {
                    continue;
                }

                roundMatches.push({ team1, team2 });
            }

            rounds.push(roundMatches);

            // Rotate: Keep position 0 fixed, rotate rest clockwise
            // [A, B, C, D] -> [A, D, B, C]
            // Position 1 gets value from position (n-1)
            // Positions 2..n-1 get value from position (i-1)
            const newCircle = [circle[0]]; // Fixed anchor
            newCircle.push(circle[n - 1]); // Last goes to position 1
            for (let i = 1; i < n - 1; i++) {
                newCircle.push(circle[i]); // Shift others right
            }
            circle = newCircle;
        }

        console.log(`[RoundRobinGenerator] Generated ${rounds.length} rounds for ${teams.length} teams`);

        return rounds;
    }
}
