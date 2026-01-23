import { supabase } from '@/lib/supabase';

// Bypass type checking for database tables
const db = supabase as any;

export interface TeamStanding {
    teamId: string;
    teamName: string;
    played: number;
    wins: number;
    losses: number;
    ties: number;
    points: number;
    buchholz: number; // Sum of opponents' points (Solkoff)
    scoreDiff: number; // Round difference
    rank: number;
}

export class StandingsService {
    /**
     * Calculate standings for a specific stage or group
     * @param stageId The stage ID
     * @param groupId Optional group ID for Round Robin
     */
    async calculateStandings(stageId: string, groupId?: string): Promise<TeamStanding[]> {
        // 1. Get all matches for this stage/group
        let query = db
            .from('brkt_matches')
            .select(`
                id, 
                team1_id, team2_id, 
                team1_score, team2_score, 
                winner_id, loser_id, 
                status,
                brkt_versions!inner(stage_id)
            `)
            .eq('brkt_versions.stage_id', stageId)
            .eq('status', 'completed');

        if (groupId) {
            query = query.eq('group_id', groupId);
        }

        const { data: matches, error } = await query;

        if (error) {
            console.error('[StandingsService] Error fetching matches:', error);
            throw error;
        }

        // 2. Initialize standings map
        const standings = new Map<string, TeamStanding>();

        // Helper to get or create standing
        const getStanding = (teamId: string): TeamStanding => {
            if (!standings.has(teamId)) {
                standings.set(teamId, {
                    teamId,
                    teamName: 'Unknown', // Will fetch names later
                    played: 0,
                    wins: 0,
                    losses: 0,
                    ties: 0,
                    points: 0,
                    buchholz: 0,
                    scoreDiff: 0,
                    rank: 0
                });
            }
            return standings.get(teamId)!;
        };

        // 3. Process match results
        for (const match of matches) {
            // Skip invalid matches with NO teams
            if (!match.team1_id && !match.team2_id) continue;

            const t1Score = match.team1_score || 0;
            const t2Score = match.team2_score || 0;

            // Handle Standard Match (2 Teams)
            if (match.team1_id && match.team2_id) {
                const team1 = getStanding(match.team1_id);
                const team2 = getStanding(match.team2_id);

                team1.played++;
                team2.played++;

                team1.scoreDiff += (t1Score - t2Score);
                team2.scoreDiff += (t2Score - t1Score);

                if (match.winner_id === match.team1_id) {
                    team1.wins++;
                    team1.points += 3;
                    team2.losses++;
                } else if (match.winner_id === match.team2_id) {
                    team2.wins++;
                    team2.points += 3;
                    team1.losses++;
                } else {
                    // Tie
                    team1.ties++;
                    team1.points += 1;
                    team2.ties++;
                    team2.points += 1;
                }
            }
            // Handle BYE for Team 1
            else if (match.team1_id && !match.team2_id) {
                const team1 = getStanding(match.team1_id);
                team1.played++;
                // BYE counts as a win
                team1.wins++;
                team1.points += 3;
                team1.scoreDiff += t1Score;
            }
            // Handle BYE for Team 2 (Unlikely but possible data shape)
            else if (!match.team1_id && match.team2_id) {
                const team2 = getStanding(match.team2_id);
                team2.played++;
                team2.wins++;
                team2.points += 3;
                team2.scoreDiff += t2Score;
            }
        }

        // 4. Calculate Buchholz (Sum of opponents' points)
        // We need a second pass because we need everyone's points first
        for (const match of matches) {
            if (!match.team1_id || !match.team2_id) continue;

            const team1 = getStanding(match.team1_id);
            const team2 = getStanding(match.team2_id);

            // Add opponent's points to your Buchholz
            team1.buchholz += team2.points;
            team2.buchholz += team1.points;
        }

        // 5. Fetch Team Names
        const teamIds = Array.from(standings.keys());
        if (teamIds.length > 0) {
            const { data: teams } = await db
                .from('teams')
                .select('id, name')
                .in('id', teamIds);

            teams?.forEach((t: any) => {
                if (standings.has(t.id)) {
                    standings.get(t.id)!.teamName = t.name;
                }
            });
        }

        // 6. Sort by Tiebreakers
        // Order: Points > Buchholz > Score Diff > Wins
        const sortedStandings = Array.from(standings.values()).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
            if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
            return b.wins - a.wins;
        });

        // 7. Assign Ranks
        sortedStandings.forEach((s, index) => {
            s.rank = index + 1;
        });

        return sortedStandings;
    }

    /**
     * Get head-to-head winner between two teams
     */
    async getHeadToHead(teamA: string, teamB: string, stageId: string): Promise<string | null> {
        const { data: matches } = await db
            .from('brkt_matches')
            .select('winner_id')
            .eq('brkt_versions.stage_id', stageId)
            .or(`and(team1_id.eq.${teamA},team2_id.eq.${teamB}),and(team1_id.eq.${teamB},team2_id.eq.${teamA})`)
            .eq('status', 'completed')
            .single();

        return matches?.winner_id || null;
    }
}

export const standingsService = new StandingsService();
