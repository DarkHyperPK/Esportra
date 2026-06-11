import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import { isSuperAdminUser } from '@/lib/adminAccess';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Globe, Eye, Loader2 } from 'lucide-react';
import BracketVisualization from '@/pages/tournaments/brackets/BracketVisualization';
import Footer from '@/components/Footer';
import { GraphMatchService } from '@/services/bracket/GraphMatchService';
import { useQueryClient } from '@tanstack/react-query';
import { optimisticBracket } from '@/services/bracket/optimisticBracket';
import { invalidateMatchLifecycleQueries } from '@/utils/matchLifecycleQueries';

const ManageBracketPage = () => {
    const { slug, stageId } = useParams<{ slug: string; stageId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user, profile, loading: authLoading } = useAuth();
    const { currentRole } = useRole();
    const admin = useAdmin();
    const queryClient = useQueryClient();

    const [tournament, setTournament] = useState<any>(null);
    const [stage, setStage] = useState<any>(null);
    const [versionId, setVersionId] = useState<string | null>(null);
    const [versionStatus, setVersionStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOrganizer, setIsOrganizer] = useState(false);

    // No longer using realtime updates for organizers to prevent data shifts 
    // during management actions. Relying on explicit fetchData(true) calls.


    const fetchData = useCallback(async (silent = false) => {
        if (!slug || !stageId) return;

        try {
            if (!silent) setLoading(true);
            console.log('ManageBracketPage: Fetching data for slug:', slug, 'stageId:', stageId);

            // Fetch tournament
            const tournamentData = await apiClient.get<any>(`/api/tournaments/by-slug/${encodeURIComponent(slug)}`).catch(() => null);

            if (!tournamentData) {
                console.error('ManageBracketPage: Tournament not found for slug:', slug);
                toast({ title: 'Error', description: 'Tournament not found', variant: 'destructive' });
                navigate('/');
                return;
            }

            console.log('ManageBracketPage: Tournament found:', tournamentData);
            setTournament(tournamentData);

            // Staff with bracket:edit permission can manage brackets too
            const ownsOrg = user?.id === tournamentData.organization?.owner_id;
            const isOrganizerUser = user?.id === tournamentData.organizer_id;
            const staffPerms: string[] = tournamentData.staffPermissions || [];
            const hasBracketPerm = staffPerms.includes('bracket:edit');
            const isSuperAdmin = isSuperAdminUser(admin, profile);
            const inOrganizerSession = currentRole === 'organizer' || isSuperAdmin;
            const canManageBracket =
                (ownsOrg || isOrganizerUser) && inOrganizerSession
                || hasBracketPerm
                || isSuperAdmin;
            setIsOrganizer(canManageBracket);

            // Fetch stage
            const stageData = await apiClient.get<any>(`/api/stages/${stageId}`).catch(() => null);

            // Parse scheduling_config if it's a JSON string (Dapper returns JSONB as string)
            if (stageData && typeof stageData.scheduling_config === 'string') {
                try { stageData.scheduling_config = JSON.parse(stageData.scheduling_config); } catch { /* ignore */ }
            }
            // Parse config if it's a JSON string
            if (stageData && typeof stageData.config === 'string') {
                try { stageData.config = JSON.parse(stageData.config); } catch { /* ignore */ }
            }

            setStage(stageData);

            // Fetch bracket version for this stage
            const versions = await apiClient.get<any[]>(`/api/tournaments/${tournamentData.id}/bracket-versions`).catch(() => []);
            const versionData = (versions || [])
                .filter((v: any) => v.stage_id === stageId && ['active', 'draft'].includes(v.status))
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

            if (versionData) {
                setVersionId(versionData.id);
                setVersionStatus(versionData.status);
            } else {
                toast({ title: 'No Bracket', description: 'No bracket found for this stage', variant: 'destructive' });
            }

        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            if (!silent) setLoading(false);
        }
    }, [slug, stageId, user?.id, navigate, toast]);

    // Handle single BYE advancement
    const handleByeAdvance = async (matchId: string) => {
        try {
            // Get the match
            const match = await apiClient.get<any>(`/api/brackets/matches/${matchId}`).catch(() => null);

            if (!match) {
                toast({ title: 'Error', description: 'Match not found', variant: 'destructive' });
                return;
            }

            // Determine which team to advance
            const winnerId = match.team1_id || match.team2_id;
            if (!winnerId) {
                toast({ title: 'Error', description: 'No team to advance', variant: 'destructive' });
                return;
            }

            // Series score: maps won (1-0 for BO1, 2-0/2-1 for BO3, etc.)
            const winScore = Math.ceil((match.best_of || 1) / 2);

            // --- OPTIMISTIC UPDATE ---
            const queryKey = ['bracket-graph', versionId];
            const previousGraphData = queryClient.getQueryData<{ nodes: any[]; edges: any[] }>(queryKey);

            if (previousGraphData && versionId) {
                const nodesWithScore = optimisticBracket.applyScore(
                    previousGraphData.nodes,
                    matchId,
                    match.team1_id ? winScore : 0,
                    match.team2_id ? winScore : 0,
                    match.team1_id,
                    match.team2_id
                );

                const nodesWithAdvancement = optimisticBracket.applyAdvancement(
                    nodesWithScore,
                    previousGraphData.edges,
                    matchId,
                    winnerId,
                    null
                );

                queryClient.setQueryData(queryKey, {
                    ...previousGraphData,
                    nodes: nodesWithAdvancement,
                });
            }
            // -------------------------

            // Use GraphMatchService to save score AND propagate winner to next match
            const result = await GraphMatchService.saveScoreAndAdvance(
                matchId,
                match.team1_id ? winScore : 0,
                match.team2_id ? winScore : 0,
                match.team1_id,
                match.team2_id
            );

            if (!result.success) {
                // ROLLBACK
                if (previousGraphData && versionId) {
                    queryClient.setQueryData(['bracket-graph', versionId], previousGraphData);
                }
                toast({ title: 'Error', description: result.error || 'Failed to advance BYE', variant: 'destructive' });
                return;
            }

            toast({ title: 'BYE Advanced', description: 'Team has been advanced!' });

            // Invalidate to sync with server truth
            invalidateMatchLifecycleQueries(queryClient, { matchId, versionId });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    // Handle publishing bracket
    const handlePublishBracket = async () => {
        if (!versionId) return;

        const selfPlayEnabled = stage?.scheduling_config?.self_play_enabled || false;

        // Validate scheduling before publishing
        try {
            if (selfPlayEnabled) {
                // Self-play mode: check that round deadlines are configured
                const schedulingConfig = queryClient.getQueryData<any>(['stage-scheduling-config', stageId]);
                const deadlines = schedulingConfig?.round_deadlines || schedulingConfig?.roundDeadlines || {};
                const hasDeadlines = Object.keys(deadlines).length > 0;

                if (!hasDeadlines) {
                    toast({
                        title: 'Round Deadlines Required',
                        description: 'Self-play mode is enabled. Please configure round deadlines in the "Round Scheduling" tab before publishing.',
                        variant: 'destructive'
                    });
                    return;
                }
            } else {
                // Manual mode: check that matches have scheduled times
                const graphData = queryClient.getQueryData<{ nodes: any[]; edges: any[] }>(['bracket-graph', versionId]);
                const nodes = graphData?.nodes || [];
                const firstRoundMatches = nodes.filter((n: any) =>
                    n.round_index === 0 && n.team1_id && n.team2_id
                );
                const unscheduledCount = firstRoundMatches.filter((n: any) => !n.scheduled_time).length;

                if (firstRoundMatches.length > 0 && unscheduledCount === firstRoundMatches.length) {
                    toast({
                        title: 'Match Scheduling Required',
                        description: 'Please schedule match times in the "Round Scheduling" tab before publishing.',
                        variant: 'destructive'
                    });
                    return;
                }
            }
        } catch {
            // If we can't check, allow publish (data might not be cached)
        }

        setIsSubmitting(true);
        try {
            await apiClient.put(`/api/brackets/${versionId}`, { status: 'active', activated_at: new Date().toISOString() });

            setVersionStatus('active');
            toast({
                title: 'Bracket Published!',
                description: 'The bracket is now visible to participants.'
            });
            fetchData(true);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchData();
        }
    }, [authLoading, fetchData]);



    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!tournament || !versionId) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-white">
                <p className="text-gray-400 mb-4">Bracket not found</p>
                <Button onClick={() => navigate(-1)} variant="outline">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white">
            <main className="relative flex min-h-[calc(100vh-5rem)] w-full flex-col px-2 py-6 md:px-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/organizer/tournament/${slug}`)}
                            className="text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Tournament
                        </Button>
                        <div className="h-4 w-px bg-white/10 hidden md:block" />
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none mb-1">
                                {stage?.name || 'Loading stage...'}
                            </h1>
                            <p className="text-xs text-gray-500 font-medium">Stage Management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isOrganizer && versionId && (
                            <div className="flex items-center gap-2">
                                {versionStatus === 'draft' ? (
                                    <Button
                                        onClick={handlePublishBracket}
                                        disabled={isSubmitting}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-6 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                                        Publish Bracket
                                    </Button>
                                ) : (
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-1.5 px-3 rounded-lg flex items-center gap-2 h-10">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Published</span>
                                    </Badge>
                                )}
                            </div>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/tournaments/${slug}/brackets`)}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-white h-10 px-4 rounded-xl"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Public View
                        </Button>
                    </div>
                </div>

                {isOrganizer && (
                    <div className="min-h-0 w-full flex-1">
                        <BracketVisualization
                            versionId={versionId}
                            tournamentId={tournament.id}
                            tournamentSlug={slug}
                            isOrganizer={isOrganizer}
                            onRefresh={() => fetchData(true)}
                            onByeAdvance={handleByeAdvance}
                            stage={stage}
                        />
                    </div>
                )}

                {/* Non-organizer view - just the bracket */}
                {!isOrganizer && (
                    <div className="min-h-0 w-full flex-1">
                        <BracketVisualization
                            versionId={versionId}
                            tournamentId={tournament.id}
                            tournamentSlug={slug}
                            isOrganizer={isOrganizer}
                            onRefresh={() => fetchData(true)}
                            onByeAdvance={handleByeAdvance}
                            stage={stage}
                        />
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default ManageBracketPage;
