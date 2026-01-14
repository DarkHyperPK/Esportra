import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trophy, AlertCircle, Swords, Copy } from 'lucide-react';
import { MatchCard } from './brackets/MatchCard';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { adaptGraphToBracketMatches, extractTeamIds } from '@/services/bracket/BracketAdapter';
import { MapVeto } from '@/components/tournament/MapVeto';
import MatchResultUpload from '@/components/tournament/MatchResultUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BracketMatch, Participant } from '@/types/bracketTypes';
import CaptainMatchHistory from '@/components/tournament/CaptainMatchHistory';

const repo = new MatchRepository();

const CaptainMatchPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [tournament, setTournament] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [userTeamId, setUserTeamId] = useState<string | undefined>(undefined);
    const [isCaptain, setIsCaptain] = useState(false);

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
                console.log('[CaptainMatchPage] No tournament ID, returning empty array');
                return [];
            }
            const { data, error } = await (supabase as any)
                .from('brkt_versions')
                .select('id, tournament_id, stage_id, status')
                .eq('tournament_id', tournament.id)
                .in('status', ['active', 'draft']); // Include both active and draft brackets
            if (error) {
                console.error('[CaptainMatchPage] Error fetching bracket versions:', error);
                throw error;
            }
            console.log('[CaptainMatchPage] Fetched bracket versions:', data);
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
        console.log('[CaptainMatchPage] Bracket Versions:', bracketVersions);
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

            // Get tournament
            const { data: tourney, error: tourneyError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('slug', slug)
                .single();

            if (tourneyError) throw tourneyError;
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
            setUserTeamId(userParticipant.team_id || userParticipant.user_id); // Use team_id or user_id for solo
        } else {
            console.log('[CaptainMatchPage] User not found in participants');
        }
    }, [user, participants]);

    // Find active match for the team
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

        return nextMatch || null; // Don't show completed matches
    }, [userTeamId, matches]);

    // Helpers for BracketMatchCard
    const getRoundName = (round: number, bracketSide?: string) => {
        if (bracketSide === 'final') return 'Grand Finals';
        if (bracketSide === 'reset') return 'Grand Finals Reset';

        const isDE = matches.some(m => m.bracketSide === 'losers');
        const totalUpperRounds = Math.log2(teamCount);
        const totalLowerRounds = 2 * totalUpperRounds - 2;

        // For Lower Bracket, rounds are different
        if (bracketSide === 'losers') {
            if (round === totalLowerRounds) return 'Lower Finals';
            if (round === totalLowerRounds - 1) return 'Lower Semifinals';
            return `Lower Round ${round}`;
        }

        // Upper Bracket / Single Elimination Naming
        if (round === totalUpperRounds) return isDE ? 'Upper Finals' : 'Finals';
        if (round === totalUpperRounds - 1) return isDE ? 'Upper Semifinals' : 'Semifinals';
        if (round === totalUpperRounds - 2) return isDE ? 'Upper Quarterfinals' : 'Quarterfinals';

        return isDE ? `Upper Round ${round}` : `Round ${round}`;
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
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
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

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
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

                {/* Main Content */}
                <Card className="bg-[#18181b] border-zinc-800 shadow-xl">
                    <CardHeader className="border-b border-zinc-800 pb-4">
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Swords className="w-5 h-5 text-emerald-500" />
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

                                {/* Actions */}
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => handleOpenVeto(activeMatch)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-12"
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
                                            Report Result
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
                                </div>

                                {activeMatch.status === 'completed' && (
                                    <div className="mt-6 text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                        <p className="text-gray-400">This match is completed.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Swords className="w-8 h-8 text-gray-600" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">No Active Match Found</h3>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    You don't have any pending matches right now. You might be waiting for an opponent, or the bracket hasn't been generated yet.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modals */}
            <Dialog open={mapVetoOpen} onOpenChange={setMapVetoOpen}>
                <DialogContent className="max-w-4xl bg-[#09090b] border-zinc-800 p-0 overflow-hidden h-[90vh]">
                    <DialogHeader className="p-6 border-b border-zinc-800 bg-[#18181b]">
                        <DialogTitle>Map Veto</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-0 h-full">
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

            {userTeamId && (
                <CaptainMatchHistory
                    tournamentId={tournament.id}
                    teamId={userTeamId}
                    matches={matches}
                />
            )}
        </div>
    );
};

export default CaptainMatchPage;
