import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react';
import BracketVisualization from '@/pages/tournaments/brackets/BracketVisualization';
import Footer from '@/components/Footer';
import { useBracketRealtime } from '@/hooks/useBracketRealtime';
import { stageCompletionService } from '@/services/bracket/StageCompletionService';
import { GraphMatchService } from '@/services/bracket/GraphMatchService';

interface AdvancingTeam {
    team_id: string;
    team_name: string;
    seed: number;
}

const ManageBracketPage = () => {
    const { slug, stageId } = useParams<{ slug: string; stageId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();

    const [tournament, setTournament] = useState<any>(null);
    const [stage, setStage] = useState<any>(null);
    const [versionId, setVersionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOrganizer, setIsOrganizer] = useState(false);

    // Stage completion state
    const [stageComplete, setStageComplete] = useState(false);
    const [advancingTeams, setAdvancingTeams] = useState<AdvancingTeam[]>([]);
    const [nextStage, setNextStage] = useState<any>(null);
    const [isAdvancing, setIsAdvancing] = useState(false);

    // Debounce ref for stage completion check to prevent race conditions
    const completionCheckTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Check stage completion when stage or versionId changes
    const checkStageCompletion = useCallback(async () => {
        if (!stageId || !versionId) return;

        try {
            const result = await stageCompletionService.checkStageCompletion(stageId);
            setStageComplete(result.isComplete);
            setAdvancingTeams(result.advancingTeams || []);
            setNextStage((result as any).nextStage || null);
        } catch (error) {
            console.error('[ManageBracketPage] Error checking stage completion:', error);
        }
    }, [stageId, versionId]);

    // Memoized update handler to prevent subscription churn
    const handleRealtimeUpdate = useCallback(() => {
        console.log('[ManageBracketPage] Realtime update received');
        // Debounce stage completion check to prevent race conditions
        if (completionCheckTimeoutRef.current) {
            clearTimeout(completionCheckTimeoutRef.current);
        }
        completionCheckTimeoutRef.current = setTimeout(() => {
            checkStageCompletion();
        }, 500);
    }, [checkStageCompletion]);

    // Subscribe to realtime bracket updates - automatically invalidates cache when matches change
    useBracketRealtime({
        tournamentId: tournament?.id || '',
        versionId: versionId || undefined,
        enabled: !!versionId,
        slug: slug,
        onUpdate: handleRealtimeUpdate
    });


    const fetchData = useCallback(async (silent = false) => {
        if (!slug || !stageId) return;

        try {
            if (!silent) setLoading(true);
            console.log('ManageBracketPage: Fetching data for slug:', slug, 'stageId:', stageId);

            // Fetch tournament
            let query = supabase.from('tournaments').select('*');

            // Check if slug is a valid UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

            if (isUuid) {
                query = query.or(`slug.eq.${slug},id.eq.${slug}`);
            } else {
                query = query.eq('slug', slug);
            }

            const { data: tournamentData, error: tournamentError } = await query.single();

            if (tournamentError) {
                console.error('ManageBracketPage: Error fetching tournament:', tournamentError);
            }

            if (!tournamentData) {
                console.error('ManageBracketPage: Tournament not found for slug:', slug);
                toast({ title: 'Error', description: 'Tournament not found', variant: 'destructive' });
                navigate('/');
                return;
            }

            console.log('ManageBracketPage: Tournament found:', tournamentData);
            setTournament(tournamentData);
            setIsOrganizer(user?.id === tournamentData.organizer_id);

            // Fetch stage
            const { data: stageData } = await supabase
                .from('tournament_stages')
                .select('*')
                .eq('id', stageId)
                .single();

            setStage(stageData);

            // Fetch bracket version for this stage
            const { data: versionData } = await (supabase as any)
                .from('brkt_versions')
                .select('id')
                .eq('stage_id', stageId)
                .in('status', ['active', 'draft'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (versionData) {
                setVersionId(versionData.id);

                // Check stage completion status
                const completionResult = await stageCompletionService.checkStageCompletion(stageId);
                setStageComplete(completionResult.isComplete);
                setAdvancingTeams(completionResult.advancingTeams);

                // Get next stage info
                const nextStageInfo = await stageCompletionService.getNextStage(stageId);
                setNextStage(nextStageInfo);
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

    // Handle advancing teams to next stage
    const handleAdvanceTeams = async () => {
        if (!stageId) return;

        setIsAdvancing(true);
        try {
            const result = await stageCompletionService.advanceTeamsToNextStage(stageId);

            if (result.success) {
                toast({
                    title: 'Teams Advanced!',
                    description: `${result.advancedCount} teams have been advanced to the next stage.`
                });

                // Navigate to tournament management page
                if (result.nextStageId) {
                    navigate(`/organizer/tournament/${slug}`);
                }
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to advance teams',
                    variant: 'destructive'
                });
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsAdvancing(false);
        }
    };

    // Handle single BYE advancement
    const handleByeAdvance = async (matchId: string) => {
        try {
            const db = supabase as any;

            // Get the match
            const { data: match, error: matchError } = await db
                .from('brkt_matches')
                .select('*')
                .eq('id', matchId)
                .single();

            if (matchError || !match) {
                toast({ title: 'Error', description: 'Match not found', variant: 'destructive' });
                return;
            }

            // Determine which team to advance
            const winnerId = match.team1_id || match.team2_id;
            if (!winnerId) {
                toast({ title: 'Error', description: 'No team to advance', variant: 'destructive' });
                return;
            }

            // Determine which team to advance
            const isBo1 = (match.best_of || 1) === 1;
            const winScore = isBo1 ? 13 : 1;

            // Use GraphMatchService to save score AND propagate winner to next match
            const result = await GraphMatchService.saveScoreAndAdvance(
                matchId,
                match.team1_id ? winScore : 0, // Winner gets 13 (BO1) or 1
                match.team2_id ? winScore : 0, // Winner gets 13 (BO1) or 1
                match.team1_id,
                match.team2_id
            );

            if (!result.success) {
                toast({ title: 'Error', description: result.error || 'Failed to advance BYE', variant: 'destructive' });
                return;
            }

            toast({ title: 'BYE Advanced', description: 'Team has been advanced!' });
            fetchData(true);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    // Handle bulk BYE advancement
    const handleAutoAdvanceByes = async () => {
        if (!versionId) {
            console.error('[AutoAdvance] No versionId found');
            return;
        }

        console.log('[AutoAdvance] querying versionId:', versionId);

        try {
            const db = supabase as any;

            // Get all pending matches with exactly one team
            const { data: byeMatches, error: fetchError } = await db
                .from('brkt_matches')
                .select('*')
                .eq('version_id', versionId)
                .eq('status', 'pending');

            if (fetchError) throw fetchError;

            if (fetchError) throw fetchError;

            console.log('[AutoAdvance] Pending matches count:', byeMatches?.length);
            console.log('[AutoAdvance] Pending matches statuses:', byeMatches?.map((m: any) => `${m.id}: ${m.status}, t1=${m.team1_id}, t2=${m.team2_id}`));

            // Filter to only PENDING BYE matches (exactly one team)
            const actualByeMatches = byeMatches?.filter((m: any) => {
                const isPending = m.status === 'pending';
                // Check if one team is missing or TBD
                // Note: The DB columns team1_id/team2_id might be null strings or empty
                const t1 = m.team1_id;
                const t2 = m.team2_id;
                const isBye = (t1 && !t2) || (!t1 && t2);
                // Note: If ids are not null but point to TBD teams, this check might fail if we don't join teams. 
                // But typically TBD teams have null IDs in matches or specific placeholders.
                // Let's assume for now the DB has NULL for missing teams.

                return isPending && isBye;
            }) || [];

            console.log('[AutoAdvance] Filtered BYE matches:', actualByeMatches.length);

            if (actualByeMatches.length === 0) {
                toast({ title: 'No BYEs', description: 'No PENDING BYE matches to advance' });
                return;
            }

            // Advance each BYE match using GraphMatchService
            let advancedCount = 0;
            for (const match of actualByeMatches) {
                const result = await GraphMatchService.saveScoreAndAdvance(
                    match.id,
                    match.team1_id ? 1 : 0,
                    match.team2_id ? 1 : 0,
                    match.team1_id,
                    match.team2_id
                );

                if (result.success) advancedCount++;
            }

            toast({
                title: 'BYEs Advanced',
                description: `${advancedCount} BYE match(es) have been processed!`
            });
            fetchData(true);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };



    useEffect(() => {
        if (!authLoading) {
            fetchData();
        }
    }, [authLoading, fetchData]);



    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-esports-dark flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!tournament || !versionId) {
        return (
            <div className="min-h-screen bg-esports-dark flex flex-col items-center justify-center text-white">
                <p className="text-gray-400 mb-4">Bracket not found</p>
                <Button onClick={() => navigate(-1)} variant="outline">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white">
            <main className="relative w-full px-4 py-8">

                {/* Bracket Visualization with Management Controls */}
                <div className="w-full">
                    <BracketVisualization
                        versionId={versionId}
                        tournamentId={tournament.id}
                        isOrganizer={isOrganizer}
                        onRefresh={() => fetchData(true)}
                        onByeAdvance={handleByeAdvance}
                        stage={stage}
                    />
                </div>
            </main >
            <Footer />
        </div >
    );
};

export default ManageBracketPage;
