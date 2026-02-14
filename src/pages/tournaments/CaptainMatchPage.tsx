import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trophy, AlertCircle, Swords, Copy, Calendar, MessageCircle } from 'lucide-react';
import { MatchCard } from './brackets/MatchCard';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import { adaptGraphToBracketMatches, extractTeamIds } from '@/services/bracket/BracketAdapter';
import { MapVeto } from '@/components/tournament/MapVeto';
import MatchResultUpload from '@/components/tournament/MatchResultUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MatchAutoReport } from '@/components/tournament/MatchAutoReport';
import { BracketMatch, Participant } from '@/types/bracketTypes';
import CaptainMatchHistory from '@/components/tournament/CaptainMatchHistory';
import MatchCheckinCard from '@/components/tournament/MatchCheckinCard';
import TimeProposalCard from '@/components/tournament/TimeProposalCard';
import DisputeCard from '@/components/tournament/DisputeCard';
import MatchChat from '@/components/tournament/MatchChat';
import { format } from 'date-fns';
import { useMatchCheckin } from '@/hooks/useMatchCheckin';

const repo = new MatchRepository();



// ... existing imports

const CaptainMatchPage = () => {
    // ... existing hooks

    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [tournament, setTournament] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [userTeamId, setUserTeamId] = useState<string | undefined>(undefined);
    const [isCaptain, setIsCaptain] = useState(false);
    const [stageFormat, setStageFormat] = useState<string>('single_elimination');
    const [roundDeadline, setRoundDeadline] = useState<string | null>(null);
    const [participantStatus, setParticipantStatus] = useState<string | null>(null);
    const [stageConfigs, setStageConfigs] = useState<Record<string, any>>({});
    // Keep schedulingConfig as a derived value or helper for backward compatibility if needed, 
    // but better to use lookups. We'll leave the state for now but ignore it in favor of the map.

    // Match actions state
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadMatchId, setUploadMatchId] = useState<string | undefined>(undefined);
    const [mapVetoOpen, setMapVetoOpen] = useState(false);
    const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);
    const [mapVetoMatchId, setMapVetoMatchId] = useState<string | null>(null);

    // Fetch all active bracket versions for tournament (graph engine)
    const { data: bracketVersions, isLoading: versionsLoading } = useQuery({
        queryKey: ['captain-bracket-versions', tournament?.id],
        queryFn: async () => {
            console.log('[CaptainMatchPage] bracketVersions queryFn called with tournament.id:', tournament?.id);
            if (!tournament?.id) {
                return [];
            }
            const { data, error } = await (supabase as any)
                .from('brkt_versions')
                .select('id, tournament_id, stage_id, status')
                .eq('tournament_id', tournament.id)
                // Filter for active/draft, but effectively we want what's relevant
                .in('status', ['active', 'draft']);
            if (error) {
                console.error('[CaptainMatchPage] Error fetching bracket versions:', error);
                throw error;
            }
            return data || [];
        },
        enabled: !!tournament?.id,
    });

    // Fetch all matches from all bracket versions
    const { data: allGraphData, isLoading: graphLoading, refetch: refetchBracket } = useQuery({
        queryKey: ['captain-all-matches', bracketVersions?.map((v: any) => v.id).join(',')],
        queryFn: async () => {
            if (!bracketVersions || bracketVersions.length === 0) return { nodes: [], edges: [] };
            const allNodes: any[] = [];
            const allEdges: any[] = [];
            for (const version of bracketVersions) {
                const { nodes, edges } = await repo.getGraphStructure(version.id);
                allNodes.push(...nodes);
                allEdges.push(...edges);
            }
            return { nodes: allNodes, edges: allEdges };
        },
        enabled: bracketVersions && bracketVersions.length > 0,
    });

    useEffect(() => {
        if (bracketVersions && bracketVersions.length > 0) {
            // Get unique stage IDs
            const stageIds = Array.from(new Set(bracketVersions.map((v: any) => v.stage_id).filter(Boolean))) as string[];
            console.log('[CaptainMatchPage] Fetching configs for stageIds:', stageIds);

            if (stageIds.length > 0) {
                supabase
                    .from('tournament_stages')
                    .select('id, format, scheduling_config')
                    .in('id', stageIds)
                    .then(({ data, error }) => {
                        if (error) {
                            console.error('Error fetching stage configs:', error);
                            return;
                        }

                        const configs: Record<string, any> = {};
                        data?.forEach((stage: any) => {
                            configs[stage.id] = {
                                format: stage.format,
                                scheduling_config: stage.scheduling_config
                            };
                        });
                        console.log('[CaptainMatchPage] Loaded stage configs:', configs);
                        setStageConfigs(configs);

                        // For backward compatibility (legacy roundDeadline state), maybe just pick the first one's deadline?
                        // Or better, don't rely on it.
                    });
            }
        }
    }, [bracketVersions]);

    useEffect(() => {
        console.log('[CaptainMatchPage] Tournament:', tournament);
    }, [tournament]);

    useEffect(() => {
        console.log('[CaptainMatchPage] All Graph Data:', allGraphData);
    }, [allGraphData]);

    // Extract team IDs and fetch team data
    const teamIds = useMemo(() => {
        if (!allGraphData?.nodes) return [];
        return extractTeamIds(allGraphData.nodes);
    }, [allGraphData?.nodes]);

    const { data: teamsData } = useQuery({
        queryKey: ['captain-teams', teamIds.join(',')],
        queryFn: async () => {
            if (teamIds.length === 0) return [];
            const { data, error } = await supabase
                .from('teams')
                .select('id, name, logo_url')
                .in('id', teamIds);
            if (error) throw error;
            return data || [];
        },
        enabled: teamIds.length > 0,
    });

    // Convert graph data to BracketMatch format
    const matches = useMemo<BracketMatch[]>(() => {
        if (!allGraphData?.nodes || !allGraphData?.edges) {
            console.log('[CaptainMatchPage] No graph data to convert');
            return [];
        }
        console.log('[CaptainMatchPage] Converting graph data:', { nodes: allGraphData.nodes.length, edges: allGraphData.edges.length });
        const teamsMap = new Map<string, { id: string; name: string; logo_url?: string | null }>();
        teamsData?.forEach((t: any) => teamsMap.set(t.id, t));
        const adapted = adaptGraphToBracketMatches(allGraphData.nodes, allGraphData.edges, teamsMap);
        console.log('[CaptainMatchPage] Adapted matches:', adapted.length);
        return adapted;
    }, [allGraphData?.nodes, allGraphData?.edges, teamsData]);

    const bracketLoading = versionsLoading || graphLoading;

    // Calculate team count from matches
    const teamCount = useMemo(() => {
        if (!allGraphData?.nodes) return 8;
        const winnersNodes = allGraphData.nodes.filter((n: any) => n.bracket_type === 'winners' && n.round_index === 0);
        return Math.max(winnersNodes.length * 2, 4);
    }, [allGraphData?.nodes]);

    // Fetch tournament details
    const fetchTournamentData = useCallback(async () => {
        if (!slug) return;
        try {
            setLoading(true);
            console.log('[CaptainMatchPage] Fetching tournament data for slug:', slug);

            // Get tournament - Try by slug first, then by ID
            let tourney;

            const { data: bySlug, error: slugError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('slug', slug)
                .maybeSingle(); // Use maybeSingle to avoid 406 error on no rows

            if (bySlug) {
                tourney = bySlug;
            } else {
                // Fallback to checking by ID
                const { data: byId, error: idError } = await supabase
                    .from('tournaments')
                    .select('*')
                    .eq('id', slug)
                    .maybeSingle();

                if (byId) {
                    tourney = byId;
                } else {
                    throw slugError || idError || new Error('Tournament not found');
                }
            }

            setTournament(tourney);

            // Get participants to identify captain's team
            const { data: parts, error: partsError } = await supabase
                .from('tournament_participants')
                .select('*')
                .eq('tournament_id', tourney.id);

            if (partsError) throw partsError;
            setParticipants(parts || []);

        } catch (error: any) {
            console.error('Error fetching tournament:', error);
            toast({
                title: 'Error',
                description: 'Failed to load tournament data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [slug, toast]);

    useEffect(() => {
        fetchTournamentData();
    }, [fetchTournamentData]);

    // Identify captain and team
    useEffect(() => {
        if (!user || !participants.length) return;

        console.log('[CaptainMatchPage] Checking captain status:', { userId: user.id, participantsCount: participants.length });
        console.log('[CaptainMatchPage] Participants data:', participants);

        const userParticipant = participants.find((p: any) =>
            p.user_id === user.id || p.team_captain_id === user.id
        ) as any;

        if (userParticipant) {
            console.log('[CaptainMatchPage] Found participant:', userParticipant);
            // Check if captain
            const isCap = userParticipant.team_captain_id === user.id ||
                (userParticipant.participant_type === 'solo' && userParticipant.user_id === user.id); // Solo players are their own captains

            console.log('[CaptainMatchPage] Is Captain?', isCap, {
                teamCaptainId: userParticipant.team_captain_id,
                userId: user.id,
                type: userParticipant.participant_type
            });

            setIsCaptain(isCap);
            setIsCaptain(isCap);
            setUserTeamId(userParticipant.team_id || userParticipant.user_id); // Use team_id or user_id for solo
            setParticipantStatus(userParticipant.status);
            console.log('[CaptainMatchPage] User not found in participants');
        }
    }, [user, participants]);

    // Find active match for the team
    const activeMatch = useMemo(() => {
        if (!userTeamId || !matches.length) {
            console.log('[CaptainMatchPage] No userTeamId or matches found. userTeamId:', userTeamId, 'matchesLength:', matches.length);
            return null;
        }

        console.log('[CaptainMatchPage] Searching for active match for team:', userTeamId);

        // Find matches involving this team
        const teamMatches = matches.filter(m =>
            m.team1?.id === userTeamId || m.team2?.id === userTeamId
        );

        console.log('[CaptainMatchPage] Found team matches:', teamMatches.length, teamMatches);

        // Sort by round/match number to find the earliest upcoming match
        // Priority: earliest pending match > earliest in_progress match > null
        const sortedTeamMatches = teamMatches.sort((a, b) => {
            if (a.round !== b.round) return a.round - b.round;
            return (a.matchNumber || 0) - (b.matchNumber || 0);
        });

        // Find the first match that is pending or in_progress (upcoming/active match)
        const nextMatch = sortedTeamMatches.find(m =>
            m.status === 'pending' || m.status === 'in_progress'
        );

        console.log('[CaptainMatchPage] Active match found:', nextMatch);

        // Return the raw match object, NOT JSX
        return nextMatch || null; // Don't show completed matches
    }, [userTeamId, matches]);

    // Find the latest completed match for context (e.g. "Waiting for next round")
    const lastCompletedMatch = useMemo(() => {
        if (!userTeamId || !matches.length) return null;
        const teamMatches = matches.filter(m =>
            (m.team1?.id === userTeamId || m.team2?.id === userTeamId) &&
            m.status === 'completed'
        );
        return teamMatches.sort((a, b) => (b.matchNumber || 0) - (a.matchNumber || 0))[0];
    }, [userTeamId, matches]);

    // Derive scheduling config for the current active match
    const activeMatchVersion = useMemo(() =>
        bracketVersions?.find((v: any) => v.id === activeMatch?.stageId),
        [bracketVersions, activeMatch?.stageId]
    );

    const schedulingConfig = useMemo(() => {
        if (!activeMatchVersion?.stage_id) return null;
        return stageConfigs[activeMatchVersion.stage_id]?.scheduling_config;
    }, [activeMatchVersion, stageConfigs]);

    // Auto-Report State
    const [matchGames, setMatchGames] = useState<any[]>([]);
    const [nextGameNumber, setNextGameNumber] = useState(1);
    const [nextGameMap, setNextGameMap] = useState<{ id: string, name: string } | null>(null);

    // Fetch Match Games (Progress)
    const fetchMatchGames = useCallback(async () => {
        if (!activeMatch) return;
        const realMatchId = activeMatch.id.replace(/^(db-|wb-|lb-)/, '');

        const { data } = await supabase
            .from('brkt_match_games')
            .select('*')
            .eq('match_id', realMatchId)
            .order('game_number');

        setMatchGames(data || []);

        // Determine Next Game Number
        const completed = (data || []).filter((g: any) => g.status === 'completed').length;
        setNextGameNumber(completed + 1);
    }, [activeMatch?.id]);

    useEffect(() => {
        fetchMatchGames();
    }, [fetchMatchGames]);

    const determineMap = useCallback(async () => {
        if (!activeMatch) return;
        const realMatchId = activeMatch.id.replace(/^(db-|wb-|lb-)/, '');

        console.log('[CaptainMatchPage] Determining map for match:', realMatchId, 'Game:', nextGameNumber);

        // Fetch Veto Info
        const { data: veto } = await supabase
            .from('match_map_vetos')
            .select('*, game_maps!selected_map_id(*)') // For BO1
            .eq('match_id', realMatchId)
            .maybeSingle();

        if (!veto) {
            console.log('[CaptainMatchPage] No veto found yet for match:', realMatchId);
            setNextGameMap(null);
            return;
        }

        // Logic for BO1
        const bestOf = activeMatch.bestOf || 1;
        if (bestOf === 1 && veto.selected_map_id && veto.game_maps) {
            setNextGameMap({
                id: veto.selected_map_id,
                name: veto.game_maps.map_name
            });
            return;
        }

        // Logic for BO3 / BO5 (and BO1 fallback)
        // We need to fetch actions to see the pick order
        const { data: actions } = await supabase
            .from('match_map_veto_actions')
            .select('*, game_maps(*)')
            .eq('match_id', realMatchId)
            .eq('action_type', 'pick')
            .order('action_number');

        if (actions && actions.length > 0) {
            const targetPick = actions[nextGameNumber - 1];
            if (targetPick && targetPick.game_maps) {
                setNextGameMap({
                    id: targetPick.map_id,
                    name: targetPick.game_maps.map_name
                });
                return;
            }
        }

        // Final fallback: check for decider map in BO3/BO5
        if (veto.status === 'completed' && veto.selected_map_id) {
            const { data: deciderMap } = await supabase
                .from('game_maps')
                .select('map_name')
                .eq('id', veto.selected_map_id)
                .single();

            if (deciderMap) {
                setNextGameMap({
                    id: veto.selected_map_id,
                    name: deciderMap.map_name
                });
                return;
            }
        }

        setNextGameMap(null);
    }, [activeMatch?.id, nextGameNumber, activeMatch?.bestOf]);

    useEffect(() => {
        determineMap();
    }, [determineMap]);



    // Realtime subscription for active match
    useEffect(() => {
        if (!activeMatch?.id) return;

        const rawMatchId = activeMatch.id.replace(/^(db-|wb-|lb-)/, '');
        console.log('[CaptainMatchPage] Subscribing to match updates:', rawMatchId);

        const channel = supabase
            .channel(`match-${rawMatchId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'brkt_matches',
                    filter: `id=eq.${rawMatchId}`
                },
                (payload) => {
                    console.log('[CaptainMatchPage] Match updated via realtime:', payload);
                    refetchBracket();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'match_map_vetos',
                    filter: `match_id=eq.${rawMatchId}`
                },
                (payload) => {
                    console.log('[CaptainMatchPage] Veto updated via realtime:', payload);
                    determineMap();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_map_veto_actions',
                    filter: `match_id=eq.${rawMatchId}`
                },
                () => {
                    console.log('[CaptainMatchPage] Veto action added via realtime');
                    determineMap();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeMatch?.id, refetchBracket, determineMap]);

    // Ref to prevent infinite retry loops on auto-forfeit failures
    const forfeitAttempted = useRef<string | null>(null);

    // Reset attempt tracker when match changes
    useEffect(() => {
        if (activeMatch?.id) {
            // Only reset if we switched to a different match
            if (forfeitAttempted.current !== activeMatch.id) {
                forfeitAttempted.current = null;
            }
        }
    }, [activeMatch?.id]);

    // Auto-forfeit check (client-side trigger)
    const {
        isCheckinWindowClosed,
        checkinStatus,
        checkIn: checkInMutation
    } = useMatchCheckin(
        activeMatch?.id.replace(/^(db-|wb-|lb-)/, ''),
        activeMatch?.team1?.id,
        activeMatch?.team2?.id
    );

    // Check for auto-forfeit condition
    useEffect(() => {
        if (!activeMatch || !activeMatch.scheduledTime || activeMatch.status !== 'pending' || !stageFormat) return;

        const scheduledTime = activeMatch.scheduledTime;
        // Check config or Default 15 mins
        const windowMinutes = schedulingConfig?.checkin_window_minutes || 15;

        // Only run if window is closed
        if (isCheckinWindowClosed(scheduledTime, windowMinutes)) {
            // Check forfeit conditions
            const t1In = checkinStatus.team1CheckedIn;
            const t2In = checkinStatus.team2CheckedIn;

            const handleForfeit = async (forfeitingTeamId: string, winningTeamId: string) => {
                const rawMatchId = activeMatch.id.replace(/^(db-|wb-|lb-)/, '');

                // Prevent infinite loop if we already tried this match
                if (forfeitAttempted.current === rawMatchId) {
                    return;
                }
                forfeitAttempted.current = rawMatchId;

                console.log(`[Auto-Forfeit] Match ${rawMatchId}: Team ${forfeitingTeamId} missed check-in.`);

                // Calculate forfeit score based on Best Of
                const bestOf = activeMatch.bestOf || 1;
                const winnerScore = bestOf === 1 ? 13 : Math.ceil(bestOf / 2);

                try {
                    const { error } = await supabase.rpc('forfeit_match', {
                        p_match_id: rawMatchId,
                        p_forfeiting_team_id: forfeitingTeamId,
                        p_winning_team_id: winningTeamId,
                        p_reason: 'Auto-Forfeit: Missed Check-in Window',
                        p_winner_score: winnerScore,
                        p_loser_score: 0
                    });
                    if (error) throw error;
                    toast({ title: 'Match Finalized', description: 'Auto-forfeit applied due to missed check-in.' });
                    refetchBracket();
                } catch (err) {
                    console.error('Forfeit error:', err);
                }
            };

            // If mismatch in check-ins (one checked in, one not)
            if (t1In && !t2In && activeMatch.team2?.id && activeMatch.team1?.id) {
                // Team 2 forfeits, Team 1 wins
                handleForfeit(activeMatch.team2.id, activeMatch.team1.id);
            } else if (!t1In && t2In && activeMatch.team1?.id && activeMatch.team2?.id) {
                // Team 1 forfeits, Team 2 wins
                handleForfeit(activeMatch.team1.id, activeMatch.team2.id);
            } else if (!t1In && !t2In) {
                // Double forfeit - Currently just logged, can be expanded to cancel match
                console.log('[Auto-Forfeit] Both teams missed check-in.');
            }
        }
    }, [activeMatch, checkinStatus, isCheckinWindowClosed, stageFormat, toast, refetchBracket, schedulingConfig]);

    const getRoundName = (round: number, bracketSide?: string) => {
        // Format-aware round naming
        if (stageFormat === 'swiss') {
            return `Swiss Round ${round}`;
        }
        if (stageFormat === 'round_robin') {
            return `Matchday ${round}`;
        }

        // Single and Double Elimination
        if (bracketSide === 'final') return 'Grand Finals';
        if (bracketSide === 'reset') return 'Grand Finals Reset';

        const teamCount = participants.length > 0 ? participants.length : 8; // Default to 8 if not loaded
        const isDE = matches.some(m => m.bracketSide === 'losers') || stageFormat === 'double_elimination';
        const totalUpperRounds = Math.max(Math.log2(teamCount), 1);
        const totalLowerRounds = 2 * totalUpperRounds - 2;

        // For Lower Bracket
        if (bracketSide === 'losers') {
            if (round === totalLowerRounds) return 'Losers Finals';
            if (round === totalLowerRounds - 1) return 'Losers Semi-Finals';
            return `Losers Round ${round}`;
        }

        // Upper Bracket / Single Elimination Naming
        const roundsFromEnd = totalUpperRounds - round + 1;
        if (roundsFromEnd === 1) return isDE ? 'Winners Finals' : 'Finals';
        if (roundsFromEnd === 2) return isDE ? 'Winners Semi-Finals' : 'Semi-Finals';
        if (roundsFromEnd === 3) return isDE ? 'Winners Quarter-Finals' : 'Quarter-Finals';

        return isDE ? `Winners Round ${round}` : `Round ${round}`;
    };

    const transformMatch = (m: BracketMatch): any => ({
        id: m.id,
        match_number: m.matchNumber,
        status: m.status,
        team1: m.team1 ? {
            id: m.team1.id,
            name: m.team1.name,
            logo: m.team1.logo_url,
            score: m.team1_score,
            isWinner: m.winner?.id === m.team1.id
        } : null,
        team2: m.team2 ? {
            id: m.team2.id,
            name: m.team2.name,
            logo: m.team2.logo_url,
            score: m.team2_score,
            isWinner: m.winner?.id === m.team2.id
        } : null,
        winner_id: m.winner?.id,
        roundName: getRoundName(m.round, m.bracketSide),
        scheduledTime: m.scheduledTime,
        resultImages: m.resultImages,
        partyCode: m.partyCode,
        bestOf: m.bestOf
    });

    // Actions handlers
    const handleOpenVeto = (match: BracketMatch) => {
        // Block veto access until match is live
        if (match.status !== 'in_progress') {
            toast({
                title: 'Match not live',
                description: 'The match must be live before starting map veto.',
                variant: 'destructive'
            });
            return;
        }
        console.log('[CaptainMatchPage] Opening Veto for match:', match.id, 'BestOf:', match.bestOf);
        setMapVetoMatch(match);
        setMapVetoMatchId(match.id);
        setMapVetoOpen(true);
    };

    const handleUploadResult = (matchId: string) => {
        setUploadMatchId(matchId);
        setUploadOpen(true);
    };

    if (loading || bracketLoading) {
        return <PremiumLoadingScreen text="SYNCHRONIZING MATCH DATA" />;
    }

    if (!tournament) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
                <Button onClick={() => navigate('/tournaments')}>Go Back</Button>
            </div>
        );
    }

    if (participantStatus === 'cancelled' || participantStatus === 'rejected') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-4">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Registration Removed</h1>
                <p className="text-gray-400 max-w-md text-center mb-6">
                    You have been removed from this tournament. This typically happens if you missed the check-in window or did not meet the entry requirements.
                </p>
                <Button onClick={() => navigate('/tournaments')}>Back to Dashboard</Button>
            </div>
        );
    }



    // Helper to calculate default deadline (matching Organizer view)
    const getDefaultDeadline = (roundIndex: number): string => {
        if (!tournament?.start_date) return '';
        // Date parsing safety
        const startDate = new Date(tournament.start_date);
        if (isNaN(startDate.getTime())) return '';

        let daysOffset = roundIndex;

        // For round robin, might need more spacing
        if (stageFormat === 'round_robin') {
            daysOffset = roundIndex; // 1 matchday per day
        }
        // For swiss, all rounds can be closer together
        else if (stageFormat === 'swiss') {
            daysOffset = roundIndex; // 1 round per day
        }

        // Add days logic
        const roundDate = new Date(startDate);
        roundDate.setDate(startDate.getDate() + daysOffset);

        // Set to end of day
        roundDate.setHours(23, 59, 0, 0);
        return roundDate.toISOString();
    };


    return (
        <div className="min-h-screen bg-esports-dark text-white p-4 md:p-8 font-body">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        className="text-gray-400 hover:text-white pl-0"
                        onClick={() => navigate(`/tournaments/${slug}`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div className="text-right">
                        <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
                        <p className="text-sm text-emerald-500 font-medium uppercase tracking-wider">Captain's Match View</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Match Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="glass-dark border-white/5 shadow-2xl rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-white/5 pb-6 bg-white/5">
                                <CardTitle className="flex items-center gap-3 text-white font-heading text-xl">
                                    <Swords className="w-5 h-5 text-esports-accent" />
                                    Your Active Match
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-8 pb-8 flex justify-center">
                                {activeMatch ? (
                                    <div className="w-full max-w-lg">
                                        {/* Round Name */}
                                        <div className="text-center mb-6">
                                            <span className="text-sm font-medium text-emerald-500 uppercase tracking-wider">
                                                {getRoundName(activeMatch.round, activeMatch.bracketSide)}
                                            </span>
                                        </div>

                                        {/* Team VS Team Display */}
                                        <div className="flex items-center justify-center gap-8 py-8">
                                            {/* Team 1 */}
                                            <div className="flex flex-col items-center gap-3">
                                                {activeMatch.team1?.logo_url ? (
                                                    <img src={activeMatch.team1.logo_url} alt={activeMatch.team1.name} className="w-20 h-20 object-contain" />
                                                ) : (
                                                    <span className="text-3xl font-bold text-zinc-400">
                                                        {(activeMatch.team1?.name || 'T1').slice(0, 2).toUpperCase()}
                                                    </span>
                                                )}
                                                <span className="text-sm font-medium text-white max-w-[120px] truncate">
                                                    {activeMatch.team1?.name || 'TBD'}
                                                </span>
                                            </div>

                                            {/* VS */}
                                            <span className="text-2xl font-bold text-zinc-600">VS</span>

                                            {/* Team 2 */}
                                            <div className="flex flex-col items-center gap-3">
                                                {activeMatch.team2?.logo_url ? (
                                                    <img src={activeMatch.team2.logo_url} alt={activeMatch.team2.name} className="w-20 h-20 object-contain" />
                                                ) : (
                                                    <span className="text-3xl font-bold text-zinc-400">
                                                        {(activeMatch.team2?.name || 'T2').slice(0, 2).toUpperCase()}
                                                    </span>
                                                )}
                                                <span className="text-sm font-medium text-white max-w-[120px] truncate">
                                                    {activeMatch.team2?.name || 'TBD'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Scheduled Time Display */}
                                        {activeMatch.scheduledTime && (
                                            <div className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/5 rounded-xl mb-6 backdrop-blur-sm">
                                                <Calendar className="w-4 h-4 text-esports-accent" />
                                                <span className="text-gray-300 font-medium">
                                                    <span className="text-gray-500 mr-2 uppercase text-xs tracking-wider">Scheduled:</span>
                                                    {format(new Date(activeMatch.scheduledTime), 'EEEE, MMM d @ h:mm a')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Check-in Card - shows when match has scheduled time */}
                                        {activeMatch.scheduledTime && activeMatch.status === 'pending' && (
                                            <div className="mb-4">
                                                <MatchCheckinCard
                                                    matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                    team1Id={activeMatch.team1?.id}
                                                    team2Id={activeMatch.team2?.id}
                                                    team1Name={activeMatch.team1?.name || 'Team 1'}
                                                    team2Name={activeMatch.team2?.name || 'Team 2'}
                                                    userTeamId={userTeamId}
                                                    scheduledTime={activeMatch.scheduledTime}
                                                    isCaptain={isCaptain}
                                                    selfPlayEnabled={schedulingConfig?.self_play_enabled || false}
                                                    checkInWindowMinutes={schedulingConfig?.checkin_window_minutes || 15}
                                                    onPartyCodeGenerated={(code) => {
                                                        refetchBracket();
                                                        toast({ title: 'Match Started', description: `Party Code: ${code}` });
                                                    }}
                                                />
                                            </div>
                                        )}



                                        {/* Time Proposal Card - shows when no scheduled time AND self-play mode is enabled */}
                                        {((!activeMatch.scheduledTime) && (schedulingConfig?.self_play_enabled && activeMatch.status === 'pending')) && (
                                            <div className="mb-4">
                                                {(() => {
                                                    const roundIndex = activeMatch.round - 1;
                                                    // Priority: 1. Explicit Config, 2. Default Calculation, 3. Legacy/Existing
                                                    const configDeadline = schedulingConfig?.round_deadlines?.[String(roundIndex)];
                                                    const defaultDeadline = getDefaultDeadline(roundIndex);
                                                    const effectiveDeadline = configDeadline || defaultDeadline || roundDeadline || activeMatch.scheduledTime;

                                                    return (
                                                        <TimeProposalCard
                                                            matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                            roundDeadline={effectiveDeadline}
                                                            team1Name={activeMatch.team1?.name || 'Team 1'}
                                                            team2Name={activeMatch.team2?.name || 'Team 2'}
                                                            userTeamId={userTeamId}
                                                            team1Id={activeMatch.team1?.id}
                                                            isCaptain={isCaptain}
                                                            onTimeAccepted={() => {
                                                                refetchBracket();
                                                                toast({ title: 'Match Scheduled!', description: 'Now proceed to check-in.' });
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-col gap-3">
                                            {/* Auto-Report Button - Prominently displayed at the top if available */}
                                            {nextGameMap && (
                                                <MatchAutoReport
                                                    matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                    gameNumber={nextGameNumber}
                                                    mapName={nextGameMap.name}
                                                    mapId={nextGameMap.id}
                                                    scheduledTime={activeMatch.scheduledTime}
                                                    userTeamId={userTeamId}
                                                    team1Id={activeMatch.team1?.id}
                                                    team2Id={activeMatch.team2?.id}
                                                    team1Name={activeMatch.team1?.name || 'Team 1'}
                                                    team2Name={activeMatch.team2?.name || 'Team 2'}
                                                    isCaptain={isCaptain}
                                                    className="w-full h-12 text-lg"
                                                    onSuccess={() => {
                                                        toast({ title: "Game Reported", description: "Result verified and saved." });
                                                        refetchBracket();
                                                        // Re-fetch games
                                                        fetchMatchGames();
                                                    }}
                                                />
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    onClick={() => handleOpenVeto(activeMatch)}
                                                    className="bg-zinc-800 hover:bg-zinc-700 text-white h-12 border border-zinc-700"
                                                    disabled={activeMatch.status === 'completed'}
                                                >
                                                    <Swords className="w-5 h-5 mr-2" />
                                                    Map Veto
                                                </Button>

                                                <Button
                                                    onClick={() => handleUploadResult(activeMatch.id)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                                                    disabled={activeMatch.status === 'completed'}
                                                >
                                                    <Trophy className="w-5 h-5 mr-2" />
                                                    Manual Report
                                                </Button>
                                            </div>

                                            {/* Party Code */}
                                            {activeMatch.partyCode && (
                                                <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Party Code</span>
                                                        <code className="text-lg font-mono text-emerald-400 font-bold tracking-wide">{activeMatch.partyCode}</code>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-10 w-10 p-0 hover:bg-zinc-800 hover:text-white"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(activeMatch.partyCode);
                                                            toast({ title: "Copied", description: "Party code copied to clipboard" });
                                                        }}
                                                    >
                                                        <Copy className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Dispute System - Show for completed matches */}
                                            {activeMatch.status === 'completed' && (
                                                <div className="mt-2">
                                                    <DisputeCard
                                                        matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                                        userTeamId={userTeamId}
                                                        isCaptain={isCaptain}
                                                        matchStatus={activeMatch.status}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {activeMatch.status === 'completed' && (
                                            <div className="mt-6 text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                                <p className="text-gray-400">This match is completed.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        {lastCompletedMatch ? (
                                            <>
                                                <div className="w-16 h-16 bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                                    <Calendar className="w-8 h-8 text-emerald-500" />
                                                </div>
                                                <h3 className="text-lg font-medium text-white mb-2">Waiting for Next Round</h3>
                                                <p className="text-gray-400 max-w-md mx-auto mb-6">
                                                    You have completed your match for {getRoundName(lastCompletedMatch.round, lastCompletedMatch.bracketSide)}.
                                                    Please wait for the next round pairings to be generated.
                                                </p>
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800 text-sm text-zinc-400">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Checking for updates...
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Swords className="w-8 h-8 text-gray-600" />
                                                </div>
                                                <h3 className="text-lg font-medium text-white mb-2">No Active Match Found</h3>
                                                <p className="text-gray-400 max-w-md mx-auto">
                                                    You don't have any pending matches right now. You might be waiting for an opponent, or the bracket hasn't been generated yet.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {userTeamId && (
                            <CaptainMatchHistory
                                tournamentId={tournament.id}
                                teamId={userTeamId}
                                matches={matches}
                            />
                        )}
                    </div>

                    {/* Right Column: Sticky Chat */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            {activeMatch ? (
                                <>
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-sm font-medium text-emerald-400">Live Match Chat</span>
                                    </div>
                                    <MatchChat
                                        matchId={activeMatch.id.replace(/^(db-|wb-|lb-)/, '')}
                                        userTeamId={userTeamId}
                                        team1Id={activeMatch.team1?.id}
                                        team1Name={activeMatch.team1?.name || 'Team 1'}
                                        team2Name={activeMatch.team2?.name || 'Team 2'}
                                    />
                                    <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200">
                                        <p className="flex gap-2">
                                            <MessageCircle className="w-4 h-4 flex-shrink-0" />
                                            Communication is key! Use this chat to coordinate map vetoes and scheduling with your opponent.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/50 text-zinc-500 p-6 text-center">
                                    <MessageCircle className="w-8 h-8 mb-3 opacity-20" />
                                    <p className="text-sm">Chat will be available when you have an active match.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <Dialog open={mapVetoOpen} onOpenChange={setMapVetoOpen}>
                    <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col bg-[#09090b] border-zinc-800 p-0 overflow-hidden">
                        <DialogHeader className="p-6 border-b border-zinc-800 bg-[#18181b] flex-shrink-0">
                            <DialogTitle>Map Veto</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-0 min-h-0">
                            {mapVetoMatch && mapVetoMatchId && (
                                <MapVeto
                                    matchId={mapVetoMatchId.replace(/^(db-|wb-|lb-)/, '')}
                                    tournamentId={tournament.id}
                                    team1Id={mapVetoMatch.team1?.id}
                                    team2Id={mapVetoMatch.team2?.id}
                                    team1Name={mapVetoMatch.team1?.name}
                                    team2Name={mapVetoMatch.team2?.name}
                                    bestOf={mapVetoMatch.bestOf}
                                    game={tournament.game}
                                    onComplete={() => {
                                        setMapVetoOpen(false);
                                        toast({ title: "Veto Completed", description: "Map veto process has been finalized." });
                                    }}
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogContent className="sm:max-w-md bg-[#18181b] border-zinc-800 p-0">
                        <MatchResultUpload
                            tournamentId={tournament.id}
                            matchId={(uploadMatchId || '').replace(/^(db-|wb-|lb-)/, '')}
                            teamId={userTeamId}
                            isCaptain={isCaptain}
                            onSuccess={() => {
                                setUploadOpen(false);
                                refetchBracket();
                                toast({ title: "Result Submitted", description: "Match result has been uploaded successfully." });
                            }}
                        />
                    </DialogContent>
                </Dialog>


            </div>
        </div>
    );
};

export default CaptainMatchPage;
