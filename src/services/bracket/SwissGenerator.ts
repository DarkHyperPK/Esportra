import { BracketGraph, BracketNode, BracketEdge, BracketVersion } from '@/types/bracket-graph';
import { IBracketGenerator } from './BracketGenerator';
import { standingsService, TeamStanding } from './StandingsService';
import { supabase } from '@/lib/supabase';

const db = supabase as any;

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
        let sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));

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
     * Generates the next round of matches for an existing Swiss bracket
     */
    /**
     * Generates the next round of matches for an existing Swiss bracket
     */
    static async generateNextRound(stageId: string, versionId: string, currentRound: number): Promise<{ success: boolean; message?: string }> {
        console.log('[SwissGenerator] Generating round for:', { stageId, versionId, currentRound });

        // 1. Fetch current standings
        const standings = await standingsService.calculateStandings(stageId);
        console.log('[SwissGenerator] Standings count:', standings.length);

        if (standings.length < 2) {
            return { success: false, message: 'Not enough teams with completed matches to generate next round.' };
        }

        // Calculate Max Rounds (log2 of total teams) or use config
        // For 32 teams -> 5 rounds.
        const maxRounds = Math.ceil(Math.log2(standings.length));
        if (currentRound >= maxRounds) {
            return { success: false, message: `Round limit reached (${maxRounds} rounds). Cannot generate Round ${currentRound + 1}.` };
        }

        // Fetch all past matches to check for rematches and identify groups
        // Try with provided versionId first
        let targetVersionId = versionId;
        let { data: history } = await db
            .from('brkt_matches')
            .select('team1_id, team2_id, group_id')
            .eq('version_id', versionId);



        // Fallback: If no history found, try to find the latest version for this stage
        // This handles cases where the UI might have a stale versionId
        if (!history || history.length === 0) {
            console.warn('[SwissGenerator] No history found for versionId:', versionId, 'Trying to find version from existing matches for stage:', stageId);

            // Find version from ACTUAL matches
            const { data: matchData } = await db
                .from('brkt_matches')
                .select('version_id, brkt_versions!inner(stage_id)')
                .eq('brkt_versions.stage_id', stageId)
                .limit(1)
                .maybeSingle();

            if (matchData) {
                console.log('[SwissGenerator] Found version from matches:', matchData.version_id);
                targetVersionId = matchData.version_id;

                const { data: historyRetry } = await db
                    .from('brkt_matches')
                    .select('team1_id, team2_id, group_id')
                    .eq('version_id', targetVersionId);

                history = historyRetry;
            } else {
                console.warn('[SwissGenerator] No matches found for this stage at all.');
            }
        }

        console.log('[SwissGenerator] History matches count:', history?.length);

        if (!history || history.length === 0) {
            // If still no history, but we have standings, maybe it's Round 2 but Round 1 matches were deleted?
            // Or maybe standings are from a different source?
            // But we can't generate Round 2 without knowing who played whom.
            return { success: false, message: 'No match history found. Cannot generate pairings.' };
        }

        const playedMap = new Set<string>();
        const groupMap = new Map<string, Set<string>>(); // groupId -> Set of teamIds
        const teamGroupMap = new Map<string, string>(); // teamId -> groupId

        history?.forEach((m: any) => {
            const gid = m.group_id || 'default';
            if (!groupMap.has(gid)) groupMap.set(gid, new Set());

            if (m.team1_id) {
                groupMap.get(gid)!.add(m.team1_id);
                teamGroupMap.set(m.team1_id, gid);
            }
            if (m.team2_id) {
                groupMap.get(gid)!.add(m.team2_id);
                teamGroupMap.set(m.team2_id, gid);
            }

            if (m.team1_id && m.team2_id) {
                playedMap.add(`${m.team1_id}-${m.team2_id}`);
                playedMap.add(`${m.team2_id}-${m.team1_id}`);
            }
        });

        // 2. Process each group separately
        const newMatches: any[] = [];
        let matchCounter = (history?.length || 0) + 1;

        for (const [groupId, teamIds] of groupMap.entries()) {
            // Filter standings for this group
            const groupStandings = standings.filter(s => teamIds.has(s.teamId));

            if (groupStandings.length === 0) {
                console.warn(`[SwissGenerator] No standings found for group ${groupId}`);
                continue;
            }

            // Group by Score
            const scoreGroups = new Map<number, TeamStanding[]>();
            groupStandings.forEach(team => {
                const score = team.points;
                if (!scoreGroups.has(score)) scoreGroups.set(score, []);
                scoreGroups.get(score)!.push(team);
            });

            // Sort groups descending by score
            const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);

            const pairings: { team1: TeamStanding, team2?: TeamStanding }[] = [];
            let floaters: TeamStanding[] = [];

            // Pairing Algorithm (Greedy with Floaters)
            for (const score of sortedScores) {
                let group = scoreGroups.get(score)!;

                // Add floaters from higher group
                if (floaters.length > 0) {
                    group = [...floaters, ...group];
                    floaters = [];
                }

                // Sort by Buchholz -> Seed (using rank from standings service)
                group.sort((a, b) => a.rank - b.rank);

                while (group.length >= 2) {
                    const team1 = group.shift()!;
                    let opponentIdx = -1;

                    for (let i = 0; i < group.length; i++) {
                        const candidate = group[i];
                        if (!playedMap.has(`${team1.teamId}-${candidate.teamId}`)) {
                            opponentIdx = i;
                            break;
                        }
                    }

                    if (opponentIdx !== -1) {
                        const team2 = group.splice(opponentIdx, 1)[0];
                        pairings.push({ team1, team2 });
                    } else {
                        floaters.push(team1);
                    }
                }

                if (group.length === 1) {
                    floaters.push(group[0]);
                }
            }

            // Handle remaining floaters (Force pair or BYE)
            // If multiple floaters remain (e.g. because of strict rematch constraints),
            // just pair them up to ensure no one vanishes.
            while (floaters.length >= 2) {
                const t1 = floaters.shift()!;
                const t2 = floaters.shift()!;
                // Note: This might create a rematch, but it's better than deleting a team.
                pairings.push({ team1: t1, team2: t2 });
            }

            if (floaters.length > 0) {
                const byeTeam = floaters.shift()!;
                pairings.push({ team1: byeTeam });
            }

            // Create Matches for this group
            const nextRound = currentRound + 1;
            pairings.forEach((pair) => {
                newMatches.push({
                    id: crypto.randomUUID(),
                    version_id: targetVersionId, // Use the resolved versionId
                    round_index: nextRound - 1,
                    match_number: matchCounter++,
                    bracket_type: 'swiss_round',
                    round_number: nextRound,
                    status: 'pending', // Always pending, even for BYEs (to allow manual advance in UI)
                    team1_id: pair.team1.teamId,
                    team2_id: pair.team2?.teamId || null,
                    winner_id: null, // Reset winner even for BYEs until advanced
                    best_of: 1, // Default to BO1 for generated rounds, logic elsewhere handles BO3
                    group_id: groupId === 'default' ? null : groupId
                });
            });
        }

        if (newMatches.length === 0) {
            return { success: false, message: 'No matches generated. Check if round is already complete.' };
        }

        // --- Auto-Schedule: Day-Per-Round Cadence ---
        // Fetch tournament start date and scheduling config for daily start time
        try {
            const { data: stageData } = await db
                .from('tournament_stages')
                .select('scheduling_config, tournament_id')
                .eq('id', stageId)
                .single();

            if (stageData) {
                const { data: tournament } = await db
                    .from('tournaments')
                    .select('start_date')
                    .eq('id', stageData.tournament_id)
                    .single();

                const dailyStartTime = stageData.scheduling_config?.daily_start_time || '20:00';
                const tournamentStart = tournament?.start_date ? new Date(tournament.start_date) : null;

                if (tournamentStart) {
                    const nextRound = currentRound + 1;
                    const roundDate = new Date(tournamentStart);
                    roundDate.setDate(roundDate.getDate() + (nextRound - 1)); // Day 1 = round 1, Day 2 = round 2, etc.

                    // Apply daily start time (HH:mm)
                    const [hours, minutes] = dailyStartTime.split(':').map(Number);
                    roundDate.setHours(hours, minutes, 0, 0);

                    const scheduledTime = roundDate.toISOString();
                    console.log(`[SwissGenerator] Auto-scheduling Round ${nextRound} to: ${scheduledTime}`);

                    // Apply scheduled_time to all new matches
                    newMatches.forEach(m => {
                        m.scheduled_time = scheduledTime;
                    });
                }
            }
        } catch (err) {
            console.warn('[SwissGenerator] Could not auto-schedule round times:', err);
            // Non-fatal: matches will be created without scheduled_time
        }

        const { error } = await db.from('brkt_matches').insert(newMatches);

        if (error) {
            console.error('[SwissGenerator] Error creating matches:', error);
            return { success: false, message: error.message };
        }

        return { success: true };
    }

    /**
     * Deletes the latest round of matches for a stage
     */
    static async deleteRound(stageId: string, roundNumber: number): Promise<{ success: boolean; message?: string }> {
        console.log('[SwissGenerator] Deleting round:', roundNumber, 'for stage:', stageId);

        // 1. Find the version for this stage
        const { data: version } = await db
            .from('brkt_versions')
            .select('id')
            .eq('stage_id', stageId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!version) {
            return { success: false, message: 'Bracket version not found.' };
        }

        // 2. Delete matches for this round
        const { error } = await db
            .from('brkt_matches')
            .delete()
            .eq('version_id', version.id)
            .eq('round_number', roundNumber);

        if (error) {
            console.error('[SwissGenerator] Error deleting round:', error);
            return { success: false, message: error.message };
        }

        return { success: true };
    }
}
