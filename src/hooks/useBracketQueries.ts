/**
 * useBracketQueries - TanStack Query hooks for Brackets.tsx
 * 
 * This module provides React Query hooks for fetching and mutating bracket data.
 * It encapsulates all Supabase calls and provides caching, background refetching,
 * and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type {
    Match,
    BracketMatch,
    BracketTeam,
    Participant
} from '@/types/bracketTypes';

// ============================================================================
// Types
// ============================================================================

interface BracketData {
    tournament: Database['public']['Tables']['tournaments']['Row'];
    participants: Participant[];
    matches: Database['public']['Tables']['tournament_matches']['Row'][];
    bracketMatches: BracketMatch[];
    teamCount: number;
    resultsByMatch: Record<string, { images: string[]; comments: string[] }>;
    stages: Database['public']['Tables']['tournament_stages']['Row'][];
    currentStage: Database['public']['Tables']['tournament_stages']['Row'] | null;
}

interface MatchPayload {
    id: string;
    match_id: string;
    tournament_id: string;
    round: number;
    match_number: number;
    team1_id: string | null;
    team2_id: string | null;
    scheduled_at: string | null;
    scheduled_time: string | null;
    best_of: number;
    bracket_side: string;
    next_match_id: string | null;
    loser_next_match_id: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

const isUuid = (s?: string | null): boolean => {
    if (!s || typeof s !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
};

const mapDbToLocalStatus = (s: string | null | undefined): 'pending' | 'in_progress' | 'completed' => {
    if (!s) return 'pending';
    const v = String(s);
    if (v === 'scheduled' || v === 'pending' || v === 'not_started') return 'pending';
    if (v === 'in_progress' || v === 'live' || v === 'ongoing') return 'in_progress';
    return 'completed';
};

// ============================================================================
// Query Hook - Fetch Bracket Data
// ============================================================================

export const useBracketData = (slug: string | undefined, selectedStageId?: string) => {
    return useQuery<BracketData | null>({
        queryKey: ['bracket', slug, selectedStageId],
        queryFn: async () => {
            if (!slug) return null;

            // 1. Fetch tournament by slug or ID
            let tournamentData: any = null;

            const { data: bySlug, error: errSlug } = await supabase
                .from('tournaments')
                .select('*')
                .eq('slug', slug)
                .single();

            if (!errSlug && bySlug) {
                tournamentData = bySlug;
            } else {
                const { data: byId, error: errId } = await supabase
                    .from('tournaments')
                    .select('*')
                    .eq('id', slug)
                    .single();
                if (!errId && byId) {
                    tournamentData = byId;
                } else {
                    throw errSlug || errId;
                }
            }

            // 2. Fetch stages
            const { data: stagesData, error: stagesError } = await supabase
                .from('tournament_stages')
                .select('*')
                .eq('tournament_id', tournamentData.id)
                .order('stage_order', { ascending: true });

            if (stagesError) throw stagesError;
            const stages = stagesData || [];
            const currentStage = selectedStageId
                ? stages.find(s => s.id === selectedStageId)
                : stages[0];

            // 3. Fetch participants and bans in parallel
            const [participantsResponse, bansResponse] = await Promise.all([
                supabase
                    .from('tournament_participants')
                    .select('*')
                    .eq('tournament_id', tournamentData.id),
                supabase
                    .from('tournament_bans')
                    .select('user_id, team_id')
                    .eq('tournament_id', tournamentData.id)
                    .eq('is_active', true)
            ]);

            if (participantsResponse.error) throw participantsResponse.error;

            // Filter out banned participants
            const bannedUserIds = new Set((bansResponse.data || []).filter(b => b.user_id).map(b => b.user_id));
            const bannedTeamIds = new Set((bansResponse.data || []).filter(b => b.team_id).map(b => b.team_id));

            const participants = (participantsResponse.data || []).filter((p: any) => {
                if (p.user_id && bannedUserIds.has(p.user_id)) return false;
                if (p.team_id && bannedTeamIds.has(p.team_id)) return false;
                return true;
            });

            // 4. Fetch matches for the current stage
            const query = supabase
                .from('tournament_matches')
                .select('*')
                .eq('tournament_id', tournamentData.id);

            if (currentStage) {
                query.eq('stage_id', currentStage.id);
            }

            const { data: matchesData, error: matchesError } = await query
                .order('round', { ascending: true })
                .order('match_number', { ascending: true });

            if (matchesError) throw matchesError;

            // 4. Fetch match results
            const { data: resultsData } = await supabase
                .from('tournament_match_results')
                .select('match_id, image_url, comment')
                .eq('tournament_id', tournamentData.id);

            const resultsByMatch: Record<string, { images: string[]; comments: string[] }> = {};
            (resultsData || []).forEach((r: any) => {
                const key = r.match_id;
                if (!key) return;
                if (!resultsByMatch[key]) resultsByMatch[key] = { images: [], comments: [] };
                if (r.image_url) resultsByMatch[key].images.push(r.image_url);
                if (r.comment) resultsByMatch[key].comments.push(r.comment);
            });

            // 5. Build team name/logo mappings
            const teamNameById = new Map<string, string>();
            const teamLogoById = new Map<string, string | null>();

            const participantTeamIds = new Set<string>();
            participants.forEach((p: any) => {
                if (p.team_id) {
                    participantTeamIds.add(p.team_id);
                    const display = p.team_name || p.roster_name;
                    if (display) teamNameById.set(p.team_id, display);
                    if (p.team_logo) teamLogoById.set(p.team_id, p.team_logo);
                }
            });

            // Fetch team names from teams table
            if (participantTeamIds.size > 0) {
                const { data: teams } = await supabase
                    .from('teams')
                    .select('id, name, logo_url')
                    .in('id', Array.from(participantTeamIds));

                (teams || []).forEach((t: any) => {
                    if (t.id && t.name) {
                        teamNameById.set(t.id, t.name);
                        if (!teamLogoById.has(t.id)) teamLogoById.set(t.id, t.logo_url || null);
                    }
                });
            }

            // 6. Convert matches to bracket format
            const matches = matchesData || [];
            const round1Matches = matches.filter((m: any) => Number(m.round || 1) === 1);
            const matchesInRound1 = round1Matches.length;
            const maxRound = matches.length > 0 ? Math.max(...matches.map((m: any) => Number(m.round || 1))) : 1;
            const teamCount = matchesInRound1 > 0 ? matchesInRound1 * 2 : Math.pow(2, Math.max(1, maxRound));

            const calculateSeed = (round: number, matchNumber: number, slot: 'team1' | 'team2', bracketSize: number): number => {
                if (round === 1) {
                    return slot === 'team1' ? matchNumber : bracketSize - matchNumber + 1;
                }
                return 0;
            };

            const bracketMatches: BracketMatch[] = matches.map((m: any) => {
                const t1Id = m.team1_id as string | null;
                const t2Id = m.team2_id as string | null;
                const t1Name = t1Id ? (teamNameById.get(t1Id) || (t1Id.startsWith('bye-') ? 'BYE' : null)) : null;
                const t2Name = t2Id ? (teamNameById.get(t2Id) || (t2Id.startsWith('bye-') ? 'BYE' : null)) : null;
                const round = Number(m.round || 1);
                const matchNum = Number(m.match_number || 1);

                const t1Seed = (round === 1 && t1Id && !t1Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team1', teamCount) : 0;
                const t2Seed = (round === 1 && t2Id && !t2Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team2', teamCount) : 0;

                // Determine Best Of:
                // 1. Check stage config first (dynamic update from wizard)
                // 2. Fallback to match record (persisted)
                // 3. Default to 1
                let effectiveBestOf = m.best_of || 1;
                if (m.stage_id) {
                    const matchStage = stages.find(s => s.id === m.stage_id);
                    if (matchStage && matchStage.config && typeof matchStage.config === 'object') {
                        // Cast to any to access config properties safely
                        const config = matchStage.config as any;
                        if (config.bestOf) {
                            console.log(`[useBracketQueries] Found stage override for match ${m.id}: BO${config.bestOf}`);
                            effectiveBestOf = Number(config.bestOf);
                        } else if (config.veto?.best_of) {
                            console.log(`[useBracketQueries] Found stage override (legacy) for match ${m.id}: BO${config.veto.best_of}`);
                            effectiveBestOf = Number(config.veto.best_of);
                        }
                    }
                } else {
                    console.log(`[useBracketQueries] Match ${m.id} has no stage_id`);
                }

                return {
                    id: `db-${m.id}`,
                    round,
                    matchNumber: matchNum,
                    team1: t1Id ? { id: t1Id, name: t1Name || 'Team', seed: t1Seed, logo_url: teamLogoById.get(t1Id) || null } : null,
                    team2: t2Id ? { id: t2Id, name: t2Name || 'Team', seed: t2Seed, logo_url: teamLogoById.get(t2Id) || null } : null,
                    winner: m.winner_team_id ? { id: m.winner_team_id, name: teamNameById.get(m.winner_team_id) || 'Winner', seed: 0, logo_url: teamLogoById.get(m.winner_team_id) || null } : null,
                    score: (typeof m.team1_score === 'number' && typeof m.team2_score === 'number') ? `${m.team1_score}-${m.team2_score}` : m.score || null,
                    team1_score: typeof m.team1_score === 'number' ? m.team1_score : null,
                    team2_score: typeof m.team2_score === 'number' ? m.team2_score : null,
                    status: mapDbToLocalStatus(m.status),
                    scheduledTime: (m.scheduled_at || m.scheduled_time) ? (() => {
                        const date = new Date(m.scheduled_at || m.scheduled_time);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                        return `${day}/${month}/${year} at ${timeStr}`;
                    })() : undefined,
                    bestOf: effectiveBestOf,
                    resultImages: resultsByMatch[m.id]?.images || [],
                    resultComments: resultsByMatch[m.id]?.comments || [],
                    partyCode: m.party_code || null,
                    bracketSide: m.bracket_side,
                    nextMatchId: m.next_match_id,
                    loserNextMatchId: m.loser_next_match_id,
                    // DEBUG FIELDS
                    stageId: m.stage_id,
                    stageConfig: m.stage_id ? stages.find(s => s.id === m.stage_id)?.config : null
                };
            });

            return {
                tournament: tournamentData,
                participants,
                matches,
                bracketMatches,
                teamCount: teamCount as number,
                resultsByMatch,
                stages,
                currentStage
            };
        },
        enabled: !!slug,
        staleTime: 30000, // Consider data fresh for 30 seconds
        refetchOnWindowFocus: false, // Don't refetch on window focus (real-time handles updates)
    });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const usePersistMatches = (tournamentId: string) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (matches: BracketMatch[]) => {
            const payload = matches.map(m => {
                const matchId = m.id.startsWith('match-') ? m.id.replace('match-', '') : m.id;
                const safeT1 = m.team1?.id?.startsWith('bye-') ? null : (m.team1?.id || null);
                const safeT2 = m.team2?.id?.startsWith('bye-') ? null : (m.team2?.id || null);
                const scheduledTimeStr = m.scheduledTime ? new Date(m.scheduledTime).toISOString() : null;

                return {
                    id: matchId,
                    match_id: matchId,
                    tournament_id: tournamentId,
                    round: m.round,
                    match_number: m.matchNumber,
                    team1_id: safeT1,
                    team2_id: safeT2,
                    scheduled_at: scheduledTimeStr,
                    scheduled_time: scheduledTimeStr,
                    best_of: m.bestOf || 1,
                    bracket_side: m.bracketSide || 'winners',
                    next_match_id: m.nextMatchId || null,
                    loser_next_match_id: m.loserNextMatchId || null,
                };
            });

            const { data, error } = await supabase
                .from('tournament_matches')
                .insert(payload)
                .select('*');

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bracket'] });
            toast({ title: 'Bracket saved', description: 'Bracket has been saved to database.' });
        },
        onError: (error: any) => {
            console.error('[useBracketQueries] Error persisting matches:', error);
            toast({
                title: 'Save failed',
                description: error?.message || 'Failed to save bracket',
                variant: 'destructive'
            });
        },
    });
};

export const useClearBracket = (tournamentId: string) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async () => {
            // Delete match results first
            await supabase
                .from('tournament_match_results')
                .delete()
                .eq('tournament_id', tournamentId);

            // Delete matches
            const { error } = await supabase
                .from('tournament_matches')
                .delete()
                .eq('tournament_id', tournamentId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bracket'] });
            toast({ title: 'Bracket cleared', description: 'All matches deleted.' });
        },
        onError: (error: any) => {
            console.error('[useBracketQueries] Error clearing bracket:', error);
            toast({
                title: 'Clear failed',
                description: error?.message || 'Failed to clear bracket',
                variant: 'destructive'
            });
        },
    });
};

export const useSaveScore = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            matchId,
            team1Score,
            team2Score,
            winnerId
        }: {
            matchId: string;
            team1Score: number;
            team2Score: number;
            winnerId: string;
        }) => {
            const { error } = await supabase
                .from('tournament_matches')
                .update({
                    team1_score: team1Score,
                    team2_score: team2Score,
                    winner_id: winnerId,
                    status: 'completed',
                })
                .eq('id', matchId);

            if (error) throw error;

            // Advance winner using RPC
            const { error: advanceError } = await supabase.rpc('advance_match_v2', {
                p_match_id: matchId,
                p_winner_id: winnerId,
                p_team1_score: team1Score,
                p_team2_score: team2Score,
            });

            if (advanceError) {
                console.warn('[useBracketQueries] advance_match_v2 error:', advanceError);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bracket'] });
            toast({ title: 'Score saved', description: 'Match result saved and teams advanced.' });
        },
        onError: (error: any) => {
            console.error('[useBracketQueries] Error saving score:', error);
            toast({
                title: 'Save failed',
                description: error?.message || 'Failed to save score',
                variant: 'destructive'
            });
        },
    });
};
