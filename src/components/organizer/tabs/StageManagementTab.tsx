import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Layers, Trophy, Lock, Shuffle, ArrowRight, ArrowUp, ArrowDown, Trash2, RefreshCw, Check } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { StageSetupWizard } from '@/components/organizer/wizard/StageSetupWizard';
import { SingleEliminationGenerator } from '@/services/bracket/SingleEliminationGenerator';
import { DoubleEliminationGenerator } from '@/services/bracket/DoubleEliminationGenerator';
import { SwissGenerator } from '@/services/bracket/SwissGenerator';
import { RoundRobinGenerator } from '@/services/bracket/RoundRobinGenerator';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { GraphValidator } from '@/services/bracket/BracketGenerator';
import { StageCompletionService } from '@/services/bracket/StageCompletionService';
import { StageProgressChip } from '@/components/tournament/StageProgressChip';
import { getStageProgressFromStage } from '@/components/tournament/getStageProgressFromStage';
import type { StageCompletionStatus } from '@/types/stageCompletion';
import { normalizeStageProgressLabel } from '@/types/stageCompletion';
import { buildStageSyncPayload } from '@/utils/stageSync';
import { runInChunks } from '@/utils/runInChunks';
import { invalidateMatchLifecycleQueries } from '@/utils/matchLifecycleQueries';
// import { useStageRealtime } from '@/hooks/useStageRealtime';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface StageManagementTabProps {
    tournamentId: string;
    stages: TournamentStage[];
    onUpdate: () => void;
    game: string;
    isPublic?: boolean;
}

export const StageManagementTab: React.FC<StageManagementTabProps> = ({ tournamentId, stages, onUpdate, game, isPublic = false }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const [addStageDialogOpen, setAddStageDialogOpen] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [newStageName, setNewStageName] = useState('');
    const [newStageFormat, setNewStageFormat] = useState('single_elimination');
    const [newStageCapacity, setNewStageCapacity] = useState<number | ''>('');
    const [newStageAdvancement, setNewStageAdvancement] = useState<number | ''>('');
    const [hasBrackets, setHasBrackets] = useState<Record<string, boolean>>({});
    const [bracketsLoading, setBracketsLoading] = useState(true);
    const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
    const [deleteBracketDialogOpen, setDeleteBracketDialogOpen] = useState(false);
    const [stageToDelete, setStageToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [tournamentWinner, setTournamentWinner] = useState<{ id?: string; name: string; logo_url?: string | null } | null>(null);

    const sortedStages = useMemo(
        () => [...stages].sort((a, b) => a.stage_order - b.stage_order),
        [stages],
    );

    const stageCompletionQueries = useQueries({
        queries: sortedStages.map((stage) => ({
            queryKey: ['stage-completion', stage.id],
            queryFn: async (): Promise<StageCompletionStatus> => {
                const raw = await apiClient.get<any>(`/api/stages/${stage.id}/completion-status`);
                return {
                    isComplete: Boolean(raw.isComplete),
                    alreadyAdvanced: Boolean(raw.alreadyAdvanced),
                    progressLabel: normalizeStageProgressLabel(raw.progressLabel),
                    reason: raw.reason,
                };
            },
            enabled: Boolean(stage.id),
            staleTime: 15_000,
        })),
    });

    const completionByStageId = useMemo(() => {
        const map = new Map<string, StageCompletionStatus>();
        sortedStages.forEach((stage, index) => {
            const result = stageCompletionQueries[index]?.data;
            if (result) map.set(stage.id, result);
        });
        return map;
    }, [sortedStages, stageCompletionQueries]);

    /* 
    // Subscribe to realtime stage updates - this will trigger onUpdate when stages change
    useStageRealtime({
        tournamentId,
        enabled: true,
        onStageStatusChange: (stageId, newStatus) => {
            console.log(`[StageManagementTab] Stage ${stageId} status changed to: ${newStatus}`);
            // Trigger parent refresh to get latest stage data
            onUpdate();
        }
    });
    */

    useEffect(() => {
        const checkBrackets = async () => {
            setBracketsLoading(true);
            try {
                // Optimized: Check all stages in a single query instead of a loop
                const versions = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/bracket-versions`).catch(() => []);

                const status: Record<string, boolean> = {};
                // Initialize all to false
                stages.forEach(s => status[s.id] = false);
                // Mark stages that have versions as true
                versions?.forEach((v: any) => {
                    status[v.stage_id] = true;
                });

                setHasBrackets(status);

            } catch (err) {
                console.error('[StageManagementTab] Error checking brackets:', err);
            } finally {
                setBracketsLoading(false);
            }
        };
        if (stages.length > 0) {
            checkBrackets();
        } else {
            setBracketsLoading(false);
        }
    }, [stages, tournamentId]);

    // Fetch tournament winner from last stage's final match
    useEffect(() => {
        const fetchWinner = async () => {
            if (stages.length === 0) return;

            // Get the last stage
            const lastStage = stages[stages.length - 1];
            const lastStageComplete =
                lastStage.status === 'completed' ||
                lastStage.progress_label === 'completed' ||
                lastStage.progress_label === 'advanced';

            if (!lastStageComplete) {
                setTournamentWinner(null);
                return;
            }

            try {
                // Get the bracket version for the last stage
                const allVersions = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/bracket-versions`).catch(() => []);
                const version = (allVersions || [])
                    .filter((v: any) => v.stage_id === lastStage.id)
                    .sort((a: any, b: any) => (b.version_number || 0) - (a.version_number || 0))[0] || null;

                if (!version) return;

                // Get the final match (highest round_index with a winner)
                const matches = await apiClient.get<any[]>(`/api/stages/${lastStage.id}/matches`).catch(() => []);
                const finalMatch = (matches || [])
                    .filter((m: any) => m.status === 'completed' && m.winner_id)
                    .sort((a: any, b: any) => (b.round_index || 0) - (a.round_index || 0))[0] || null;

                if (finalMatch?.winner_id) {
                    const winnerId = String(finalMatch.winner_id);
                    const winnerName = winnerId === String(finalMatch.team1_id)
                        ? finalMatch.team1_name
                        : winnerId === String(finalMatch.team2_id)
                            ? finalMatch.team2_name
                            : null;
                    const winnerLogo = winnerId === String(finalMatch.team1_id)
                        ? finalMatch.team1_logo
                        : winnerId === String(finalMatch.team2_id)
                            ? finalMatch.team2_logo
                            : null;

                    if (winnerName) {
                        setTournamentWinner({ name: winnerName, logo_url: winnerLogo ?? null });
                        return;
                    }

                    const participants = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/participants`).catch(() => []);
                    const winnerParticipant = (participants || []).find(
                        (p) => String(p.id) === winnerId || String(p.team_id) === winnerId,
                    );

                    if (winnerParticipant) {
                        setTournamentWinner({
                            name: winnerParticipant.display_name || winnerParticipant.team_name || 'Winner',
                            logo_url: winnerParticipant.display_logo_url || winnerParticipant.team_logo_url || null,
                        });
                        return;
                    }

                    const team = await apiClient.get<any>(`/api/teams/${winnerId}`).catch(() => null);
                    if (team) {
                        setTournamentWinner(team);
                    }
                }
            } catch (error) {
                console.error('[StageManagement] Error fetching winner:', error);
            }
        };

        fetchWinner();
    }, [stages, tournamentId]);

    const handleAddStage = async () => {
        if (!tournamentId || !newStageName) return;
        try {
            const stageDtos = buildStageSyncPayload(sortedStages, {
                name: newStageName,
                format: newStageFormat,
                capacity: newStageCapacity === '' ? null : Number(newStageCapacity),
                advancementCount: newStageAdvancement === '' ? null : Number(newStageAdvancement),
                bestOf: 1,
            });

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });

            toast({ title: 'Stage added', description: `${newStageName} has been added to the tournament.` });
            setAddStageDialogOpen(false);
            setNewStageName('');
            setNewStageFormat('single_elimination');
            setNewStageCapacity('');
            setNewStageAdvancement('');
            onUpdate();
        } catch (error: any) {
            console.error('Error adding stage:', error);
            toast({ title: 'Error', description: error.message || 'Failed to add stage', variant: 'destructive' });
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        try {
            // First, get all versions for this stage
            const allVersions = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/bracket-versions`).catch(() => []);
            const versions = (allVersions || []).filter((v: any) => v.stage_id === stageId);

            if (versions && versions.length > 0) {
                // Delete each version (cascades to matches/advancements on backend)
                for (const v of versions) {
                    await apiClient.delete(`/api/brackets/${v.id}`);
                }
            }

            // Now delete the stage
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: [stageId] });

            // Fix #7: Reorder remaining stages to close gaps
            const remainingStages = stages
                .filter(s => s.id !== stageId)
                .sort((a, b) => a.stage_order - b.stage_order);

            for (let i = 0; i < remainingStages.length; i++) {
                if (remainingStages[i].stage_order !== i + 1) {
                    await apiClient.patch(`/api/stages/${remainingStages[i].id}/order`, {
                        stageOrder: i + 1
                    });
                }
            }

            toast({ title: 'Stage deleted', description: 'The stage and its bracket data have been removed.' });
            onUpdate();
        } catch (error: any) {
            console.error('Error deleting stage:', error);
            toast({ title: 'Error', description: error.message || 'Failed to delete stage', variant: 'destructive' });
        }
    };

    const handleDeleteAllStages = async () => {
        try {
            setIsDeleting(true);
            const stageIds = stages.map(s => s.id);

            // Get all versions for these stages
            const allVersions = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/bracket-versions`).catch(() => []);
            const versions = (allVersions || []).filter((v: any) => stageIds.includes(v.stage_id));

            if (versions && versions.length > 0) {
                await runInChunks(versions, 5, async (v) => {
                    await apiClient.delete(`/api/brackets/${v.id}`);
                });
            }

            // Delete all stages
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: stageIds });

            toast({ title: 'All stages deleted', description: 'All tournament stages and bracket data have been removed.' });
            setDeleteAllDialogOpen(false);
            onUpdate();
        } catch (error: any) {
            console.error('Error deleting all stages:', error);
            const isRateLimited = error?.status === 429 || String(error?.message ?? '').includes('Too many requests');
            toast({
                title: 'Error',
                description: isRateLimited
                    ? 'Too many requests. Please wait a minute and try again.'
                    : error.message || 'Failed to delete stages',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    // Reset All Stages - keeps stages but clears brackets and resets status
    const [resetAllDialogOpen, setResetAllDialogOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleResetAllStages = async () => {
        try {
            setIsResetting(true);
            // Get all stage IDs
            const stageIds = stages.map(s => s.id);

            // Get all versions for these stages
            const allVersions = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/bracket-versions`).catch(() => []);
            const versions = (allVersions || []).filter((v: any) => stageIds.includes(v.stage_id));

            if (versions && versions.length > 0) {
                await runInChunks(versions, 5, async (v) => {
                    await apiClient.post(`/api/brackets/${v.id}/reset`, {});
                });
                await runInChunks(versions, 5, async (v) => {
                    await apiClient.delete(`/api/brackets/${v.id}`);
                });
            }

            // Reset all stage statuses to 'upcoming'
            await runInChunks(stageIds, 5, async (stageId) => {
                await apiClient.put(`/api/tournaments/${tournamentId}/stages`, {
                    stage_id: stageId,
                    status: 'upcoming',
                });
            });

            // Clear hasBrackets state
            setHasBrackets({});

            toast({ title: 'All stages reset', description: 'All brackets and team data have been cleared. Stages are ready to generate new brackets.' });
            invalidateMatchLifecycleQueries(queryClient, {});
            setResetAllDialogOpen(false);
            onUpdate();
        } catch (error: any) {
            console.error('Error resetting all stages:', error);
            const isRateLimited = error?.status === 429 || String(error?.message ?? '').includes('Too many requests');
            toast({
                title: 'Error',
                description: isRateLimited
                    ? 'Too many requests. Please wait a minute and try again.'
                    : error.message || 'Failed to reset stages',
                variant: 'destructive',
            });
        } finally {
            setIsResetting(false);
        }
    };

    const handleGenerateStageBracket = async (stageId: string) => {
        // Find the stage to get its format
        const stage = stages.find(s => s.id === stageId);
        if (!stage) {
            toast({ title: 'Error', description: 'Stage not found', variant: 'destructive' });
            return;
        }

        try {
            // Get teams/participants for this stage
            let teams: Array<{ id: string; name: string; logo_url?: string | null }> = [];

            // Check stage config for check-in filtering
            const stageConf = typeof stage.config === 'string'
                ? (() => { try { return JSON.parse(stage.config as string); } catch { return {}; } })()
                : (stage.config || {});
            const useCheckInOnly = stage.stage_order === 1 && !!stageConf.use_check_in_only;

            if (stage.stage_order === 1) {
                // First stage: Get participants from tournament_participants
                console.log('[StageManagement] Fetching teams for stage 1, tournamentId:', tournamentId);

                const allParticipants = useCheckInOnly
                    ? await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/participants`).catch(() => null)
                    : null;

                const statusFilter = useCheckInOnly ? '?status=checked_in' : '';
                const participants = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/participants${statusFilter}`).catch(() => null);

                if (!participants) {
                    console.error('[StageManagement] Error fetching participants');
                    toast({
                        title: 'Fetch Error',
                        description: 'Failed to fetch participants',
                        variant: 'destructive'
                    });
                    return;
                }

                if (useCheckInOnly) {
                    const checkedInCount = participants.length;
                    const eligibleCount = allParticipants?.length ?? checkedInCount;
                    const pendingCount = Math.max(eligibleCount - checkedInCount, 0);
                    const minimumRequired = 2;

                    if (checkedInCount < minimumRequired) {
                        toast({
                            title: 'Not enough checked-in teams',
                            description: pendingCount > 0
                                ? `Need at least ${minimumRequired} checked-in teams to generate this bracket. ${pendingCount} eligible ${pendingCount === 1 ? 'entry is' : 'entries are'} still pending check-in.`
                                : `Need at least ${minimumRequired} checked-in teams to generate this bracket.`,
                            variant: 'destructive',
                        });
                        return;
                    }
                }

                console.log('[StageManagement] Found participants raw count:', participants?.length || 0);

                teams = (participants || []).map((p: any) => {
                    const isTeam = p.participant_type === 'team'
                        || p.registration_type === 'team'
                        || p.entry_kind === 'real_team';

                    if (isTeam) {
                        return {
                            id: p.team_id || p.id,
                            name: p.teams?.name || p.team_name || 'Unknown Team',
                            logo_url: p.teams?.logo_url || p.team_logo_url
                        };
                    } else {
                        return {
                            id: p.id,
                            name: p.gamer_tag || p.team_name || 'Unknown Player',
                            logo_url: null
                        };
                    }
                }).filter(t => t.id);
            } else {
                // Subsequent stages: Get teams from stage_participants (advanced from previous stage)
                console.log('[StageManagement] Fetching teams for stage >1, stageId:', stageId);
                const stageParticipants = await apiClient.get<any[]>(`/api/stages/${stageId}/participants`).catch(() => null);

                if (!stageParticipants) throw new Error('Failed to fetch stage participants');

                teams = (stageParticipants || []).map((sp: any) => ({
                    id: sp.team_id,
                    name: sp.teams?.name || 'Unknown',
                    logo_url: sp.teams?.logo_url
                })).filter(t => t.id);
            }
            if (teams.length < 2) {
                if (useCheckInOnly) {
                    toast({
                        title: 'Not enough checked-in teams',
                        description: 'Need at least 2 checked-in teams to generate this bracket.',
                        variant: 'destructive',
                    });
                    return;
                }

                if (!isPublic) {
                    // Draft mode: refuse empty brackets — organizer must generate mock teams first.
                    toast({
                        title: 'No participants yet',
                        description: 'Use Mock Tournament Mode to generate fictitious teams before generating a bracket.',
                        variant: 'destructive',
                    });
                    return;
                }

                // Published tournament with real but sparse registrations — generate TBD bracket.
                const capacity = stage.capacity ? Number(stage.capacity) : (stage.stage_order === 1 ? 8 : 4);
                const tbdSlots = Math.max(capacity, 2);
                teams = [];
                (teams as any).__tbdSize = tbdSlots;
                toast({
                    title: 'Generating empty bracket',
                    description: `No participants yet — generating a ${tbdSlots}-slot TBD bracket from stage capacity.`,
                });
            }

            // Clean up any existing bracket for this stage before re-generating
            const existingVersions = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/bracket-versions`).catch(() => []);
            const stageVersions = (existingVersions || []).filter((v: any) => v.stage_id === stageId);

            for (const v of stageVersions) {
                await apiClient.delete(`/api/brackets/${v.id}`);
            }

            console.log(`[StageManagement] Deleted ${stageVersions.length} existing versions for stage ${stageId}`);

            // Get next version_number across the whole tournament
            const allTournamentVersions = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/bracket-versions`).catch(() => []);

            const allTournamentVersionsSorted = (allTournamentVersions || []).sort((a: any, b: any) => (b.version_number || 0) - (a.version_number || 0));

            const maxV = allTournamentVersionsSorted.length > 0 ? allTournamentVersionsSorted[0].version_number : 0;
            const nextVersionNumber = maxV + 1;
            console.log(`[StageManagement] Max version in tournament: ${maxV}, Assigning: ${nextVersionNumber}`);

            // Generate based on stage format
            const format = stage.format || 'single_elimination';
            let generator;
            let bracketSize: number | undefined = undefined;

            // Bracket Size remains undefined to allow auto-sizing based on participant count

            // Parse config once — API may return it as JSON string
            const stageConfig: any = typeof stage.config === 'string'
                ? (() => { try { return JSON.parse(stage.config as string); } catch { return {}; } })()
                : (stage.config || {});

            if (format === 'single_elimination') {
                generator = new SingleEliminationGenerator();
            } else if (format === 'double_elimination') {
                generator = new DoubleEliminationGenerator();
            } else if (format === 'swiss') {
                generator = new SwissGenerator();
                console.log('[StageManagement] Swiss config from stage:', stageConfig);
                if (stageConfig.swiss_rounds) {
                    bracketSize = Number(stageConfig.swiss_rounds);
                }
            } else if (format === 'round_robin') {
                generator = new RoundRobinGenerator();
                if (stageConfig.group_count) {
                    bracketSize = Number(stageConfig.group_count);
                } else if (stage.capacity) {
                    const groupSize = 4;
                    bracketSize = Math.ceil(Number(stage.capacity) / groupSize);
                    console.log('[StageManagement] Auto-calculated RR group_count:', bracketSize, 'from capacity:', stage.capacity);
                } else {
                    bracketSize = Math.ceil(teams.length / 4);
                    console.log('[StageManagement] Fallback RR group_count:', bracketSize, 'from teams:', teams.length);
                }
            } else {
                toast({ title: 'Error', description: `Unsupported format: ${format}`, variant: 'destructive' });
                return;
            }

            const bestOf = (stage as any).best_of || stageConfig.best_of || 1;
            const advancementCount = stage.advancement_count || undefined;

            // For TBD (no-participant) brackets, override bracketSize from the captured capacity
            // so the structure is sized correctly regardless of format-specific logic above.
            const tbdSize = (teams as any).__tbdSize as number | undefined;
            if (tbdSize !== undefined) {
                bracketSize = tbdSize;
            }

            // Fetch tournament start date and scheduling config for auto-scheduling (Swiss/RR)
            const enrichedConfig = { ...stageConfig };
            if (format === 'swiss' || format === 'round_robin') {
                try {
                    const response = await apiClient.get<any>(`/api/tournaments/${tournamentId}`).catch(() => null);
                    const tournamentData = response?.tournament || response;

                    const stageScheduling = await apiClient.get<any>(`/api/stages/${stageId}`).catch(() => null);

                    if (tournamentData?.start_date) {
                        enrichedConfig.tournament_start_date = tournamentData.start_date;
                    }
                    if (stageScheduling?.scheduling_config?.daily_start_time) {
                        enrichedConfig.daily_start_time = stageScheduling.scheduling_config.daily_start_time;
                    }
                } catch (err) {
                    console.warn('[StageManagement] Could not fetch scheduling config:', err);
                }
            }

            console.log('[StageManagement] Calling generator with:', {
                format,
                teams: teams.length,
                bestOf,
                bracketSize,
                advancementCount,
                config: enrichedConfig
            });
            const graph = generator.generate(teams, tournamentId, stageId, bestOf, bracketSize, advancementCount, enrichedConfig);
            graph.version.version_number = nextVersionNumber;

            // Validate
            const errors = GraphValidator.validate(graph);
            if (errors.length > 0) {
                console.error('Validation errors:', errors);
                throw new Error('Graph validation failed: ' + errors.join(', '));
            }

            // Save to DB
            const repo = new MatchRepository();
            await repo.createVersion(graph);

            // Update state and navigate
            setHasBrackets(prev => ({ ...prev, [stageId]: true }));

            // Runtime BYE warning (Medium Priority)
            if (format === 'single_elimination' || format === 'double_elimination') {
                const actualBracketSize = Math.pow(2, Math.ceil(Math.log2(teams.length)));
                const byeCount = actualBracketSize - teams.length;
                const byePercentage = (byeCount / actualBracketSize) * 100;
                if (byePercentage > 50) {
                    toast({
                        title: 'Warning: High BYE Count',
                        description: `${byeCount} of ${actualBracketSize} slots are BYEs (${byePercentage.toFixed(0)}%). Consider adjusting team count.`,
                        variant: 'destructive'
                    });
                }
            }

            toast({ title: 'Success', description: 'Bracket generated successfully!' });
            navigate(`/organizer/tournament/${slug}/manage-bracket/${stageId}`);
        } catch (error: any) {
            console.error('Error generating bracket:', error);
            toast({
                title: 'Error',
                description: getApiErrorMessage(error, 'Failed to generate bracket'),
                variant: 'destructive',
            });
        }
    };

    const handleDeleteStageBracket = (stageId: string) => {
        setStageToDelete(stageId);
        setDeleteBracketDialogOpen(true);
    };

    const confirmDeleteStageBracket = async () => {
        if (!stageToDelete) return;

        try {
            setIsDeleting(true);
            // Delete all brkt_versions for this stage (cascade will delete matches, edges, etc.)
            const stageVersions = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/bracket-versions`).catch(() => []);
            const toDelete = (stageVersions || []).filter((v: any) => v.stage_id === stageToDelete);
            for (const v of toDelete) {
                await apiClient.delete(`/api/brackets/${v.id}`);
            }

            // Update local state
            setHasBrackets(prev => ({ ...prev, [stageToDelete]: false }));
            toast({ title: 'Success', description: 'Bracket deleted successfully.' });
            setDeleteBracketDialogOpen(false);
            setStageToDelete(null);
            onUpdate();
        } catch (error: any) {
            console.error('Error deleting bracket:', error);
            toast({ title: 'Error', description: error.message || 'Failed to delete bracket', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewBracket = (stageId: string) => {
        // Navigate to the organizer bracket management page
        navigate(`/organizer/tournament/${slug}/manage-bracket/${stageId}`);
    };

    const [advancedStages, setAdvancedStages] = useState<Record<string, boolean>>({});

    const [advancingStages, setAdvancingStages] = useState<Record<string, boolean>>({});

    // On mount, check which stages have already been advanced
    // by checking if the next stage has enrolled participants
    useEffect(() => {
        const checkAdvancedStages = async () => {
            const result: Record<string, boolean> = {};
            for (let i = 0; i < stages.length - 1; i++) {
                const nextStage = stages[i + 1];
                if (!nextStage) continue;
                try {
                    const participants = await apiClient.get<any[]>(`/api/stages/${nextStage.id}/participants`).catch(() => []);
                    const list = Array.isArray(participants) ? participants : (participants as any)?.items || [];
                    result[stages[i].id] = list.length > 0;
                } catch {
                    result[stages[i].id] = false;
                }
            }
            setAdvancedStages(prev => ({ ...prev, ...result }));
        };
        if (stages.length > 1) {
            checkAdvancedStages();
        }
    }, [stages]);

    const handleAdvanceTeams = async (stageId: string) => {
        if (advancedStages[stageId] || advancingStages[stageId]) return;
        setAdvancingStages(prev => ({ ...prev, [stageId]: true }));
        try {
            const completionService = new StageCompletionService();
            const { isComplete } = await completionService.checkStageCompletion(stageId);
            if (!isComplete) {
                toast({ title: 'Stage Not Complete', description: 'All matches must be completed before advancing teams.', variant: 'destructive' });
                setAdvancingStages(prev => ({ ...prev, [stageId]: false }));
                return;
            }

            const service = new StageCompletionService();
            const result = await service.advanceTeamsToNextStage(stageId);

            if (!result.success) {
                throw new Error(result.error);
            }

            toast({ title: 'Teams Advanced', description: `${result.advancedCount} teams have been advanced to the next stage.` });
            setAdvancedStages(prev => ({ ...prev, [stageId]: true }));
            onUpdate();
        } catch (error: any) {
            console.error('Error advancing teams:', error);
            toast({ title: 'Error', description: error.message || 'Failed to advance teams', variant: 'destructive' });
        } finally {
            setAdvancingStages(prev => ({ ...prev, [stageId]: false }));
        }
    };

    const handleReorderStage = async (stageId: string, direction: 'up' | 'down') => {
        // ... (existing reorder logic)
        const currentIndex = stages.findIndex(s => s.id === stageId);
        if (currentIndex === -1) return;
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === stages.length - 1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const currentStage = stages[currentIndex];
        const targetStage = stages[targetIndex];

        try {
            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, {
                stage_id: currentStage.id,
                stage_order: targetStage.stage_order
            });

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, {
                stage_id: targetStage.id,
                stage_order: currentStage.stage_order
            });

            onUpdate();
        } catch (error: any) {
            console.error('Error reordering stages:', error);
            toast({ title: 'Error', description: 'Failed to reorder stages', variant: 'destructive' });
        }
    };

    return (
        <>
            <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6 group">
                <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle>Tournament Stages</CardTitle>
                        <p className="text-sm text-gray-400 mt-1">Manage the different phases of your tournament.</p>
                    </div>
                    <div className="flex gap-2">
                        {stages.length > 0 && (
                            <Button
                                onClick={() => setResetAllDialogOpen(true)}
                                variant="outline"
                                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reset All
                            </Button>
                        )}
                        {stages.length > 0 && (
                            <Button
                                onClick={() => setDeleteAllDialogOpen(true)}
                                variant="outline"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete All
                            </Button>
                        )}
                        <Button
                            onClick={() => setWizardOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                        >
                            <Layers className="w-4 h-4" />
                            {stages.length > 0 ? 'Manage Stages' : 'Create Tournament Stages'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {stages.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-white/10/20 rounded-xl">
                            <Layers className="w-12 h-12 text-gaming-gray/40 mx-auto mb-4" />
                            <p className="text-gray-400">No stages defined yet. Add your first stage to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stages.map((stage, index) => {
                                const completion = completionByStageId.get(stage.id);
                                const progressLabel = stage.progress_label
                                    ? normalizeStageProgressLabel(stage.progress_label)
                                    : (completion?.progressLabel ?? getStageProgressFromStage(stage));
                                const stageComplete = completion?.isComplete ?? false;

                                return (
                                <div
                                    key={stage.id}
                                    className="p-6 bg-zinc-800/10 border border-white/10/30 rounded-lg hover:border-emerald-400/30 transition-all"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{stage.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-400 uppercase tracking-wider bg-gray-800 px-2 py-0.5 rounded">
                                                        {stage.format?.replace('_', ' ') || 'N/A'}
                                                    </span>
                                                    <StageProgressChip progressLabel={progressLabel} />
                                                    {stage.is_locked && (
                                                        <span className="bg-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                                                            <Lock className="w-3 h-3" /> Locked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col gap-1 mr-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-gray-400 hover:text-white"
                                                    disabled={index === 0}
                                                    onClick={() => handleReorderStage(stage.id, 'up')}
                                                >
                                                    <ArrowUp className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-gray-400 hover:text-white"
                                                    disabled={index === stages.length - 1}
                                                    onClick={() => handleReorderStage(stage.id, 'down')}
                                                >
                                                    <ArrowDown className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                onClick={() => handleDeleteStage(stage.id)}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {index < stages.length - 1 && (
                                        <div className="mb-4 p-4 bg-black/20 rounded-lg border border-white/5">
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 block">Advancement</label>
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-4 h-4 text-amber-500" />
                                                    <span className="text-white font-medium">{stage.advancement_count ? `Top ${stage.advancement_count} advance` : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-3">
                                        {/* Bracket Generation/Management Button */}
                                        {(() => {
                                            // Show loading state while checking brackets
                                            if (bracketsLoading) {
                                                return (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs border-gray-600 text-gray-400"
                                                        disabled
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                                                        Loading...
                                                    </Button>
                                                );
                                            }

                                            const stageBracketExists = hasBrackets[stage.id];
                                            const isFirstStage = index === 0;
                                            const previousStage = index > 0 ? stages[index - 1] : null;
                                            const previousStageCompleted = previousStage
                                                ? (completionByStageId.get(previousStage.id)?.isComplete ?? false)
                                                : true;
                                            const previousStageBracketExists = previousStage ? hasBrackets[previousStage.id] : true;

                                            // Can generate bracket if: first stage OR previous stage is completed with brackets
                                            const canGenerate = isFirstStage || (previousStageCompleted && previousStageBracketExists);
                                            const isBlocked = !stageBracketExists && !canGenerate && !stage.is_locked;

                                            return (
                                                <div className="relative group">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className={`text-xs ${stageBracketExists
                                                            ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                                            : isBlocked
                                                                ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                                                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                                            }`}
                                                        onClick={() => stageBracketExists ? handleViewBracket(stage.id) : handleGenerateStageBracket(stage.id)}
                                                        disabled={(!stageBracketExists && (stage.is_locked || isBlocked))}
                                                    >
                                                        {stageBracketExists ? (
                                                            <>
                                                                <Layers className="w-3.5 h-3.5 mr-2" />
                                                                Manage Bracket
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shuffle className="w-3.5 h-3.5 mr-2" />
                                                                {stage.format === 'swiss' ? 'Generate Round 1' :
                                                                    stage.format === 'round_robin' ? 'Generate Groups' :
                                                                        'Generate Bracket'}
                                                            </>
                                                        )}
                                                    </Button>

                                                    {/* Delete Bracket Button - only show when bracket exists */}
                                                    {stageBracketExists && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                            onClick={() => handleDeleteStageBracket(stage.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                            Delete Matches
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {/* Winner Display - only on last completed stage */}
                                        {index === stages.length - 1 && stageComplete && tournamentWinner && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                                <Trophy className="w-4 h-4 text-amber-400" />
                                                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Winner:</span>
                                                <span className="text-white font-bold">{tournamentWinner.name}</span>
                                            </div>
                                        )}
                                        {index < stages.length - 1 && (
                                            advancedStages[stage.id] ? (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                                    <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Teams Advanced</span>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                                                    onClick={() => handleAdvanceTeams(stage.id)}
                                                    disabled={advancingStages[stage.id]}
                                                >
                                                    {advancingStages[stage.id] ? (
                                                        <>
                                                            <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                                                            Advancing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowRight className="w-3.5 h-3.5 mr-2" />
                                                            Advance Teams
                                                        </>
                                                    )}
                                                </Button>
                                            )
                                        )}

                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={addStageDialogOpen} onOpenChange={setAddStageDialogOpen}>
                <DialogContent className="bg-[#0a0a0c] border border-white/10 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Tournament Stage</DialogTitle>
                        <DialogDescription>
                            {stages.length === 0
                                ? 'Define the first stage for your tournament.'
                                : `Adding Stage ${stages.length + 1}. Capacity will be linked to Stage ${stages.length}'s advancement count.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200">Stage Name</label>
                            <input
                                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-emerald-500/50"
                                placeholder="e.g. Qualifiers, Playoffs, Finals"
                                value={newStageName}
                                onChange={(e) => setNewStageName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200">Format</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-emerald-500/50"
                                value={newStageFormat}
                                onChange={(e) => setNewStageFormat(e.target.value)}
                            >
                                <option value="single_elimination">Single Elimination</option>
                                <option value="double_elimination">Double Elimination</option>
                                <option value="round_robin">Round Robin</option>
                                <option value="swiss">Swiss</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-200 flex items-center justify-between">
                                    <span>Capacity</span>
                                    {stages.length > 0 && stages[stages.length - 1]?.advancement_count && (
                                        <span className="text-xs text-emerald-400">From Stage {stages.length}</span>
                                    )}
                                </label>
                                {stages.length === 0 ? (
                                    <>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-emerald-500/50"
                                            placeholder="From tournament max teams"
                                            value={newStageCapacity}
                                            onChange={(e) => setNewStageCapacity(e.target.value === '' ? '' : parseInt(e.target.value))}
                                            disabled
                                        />
                                        <p className="text-xs text-gray-500">Stage 1 capacity = tournament max teams</p>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-800/50 border border-emerald-500/30 rounded-md px-3 py-2 text-gray-300 cursor-not-allowed"
                                            value={stages[stages.length - 1]?.advancement_count || 'Not set'}
                                            disabled
                                        />
                                        <p className="text-xs text-gray-500">
                                            {stages[stages.length - 1]?.advancement_count
                                                ? `${stages[stages.length - 1]?.advancement_count} teams from Stage ${stages.length}`
                                                : `⚠️ Stage ${stages.length} has no advancement count set`}
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-200">Advancement Count</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-emerald-500/50"
                                    placeholder="N/A (Last Stage)"
                                    value={newStageAdvancement}
                                    onChange={(e) => setNewStageAdvancement(e.target.value === '' ? '' : parseInt(e.target.value))}
                                />
                                <p className="text-xs text-gray-500">Teams advancing to next stage</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddStageDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                // Auto-set capacity from previous stage advancement
                                if (stages.length > 0) {
                                    const prevAdvancement = stages[stages.length - 1]?.advancement_count;
                                    if (prevAdvancement) {
                                        setNewStageCapacity(prevAdvancement);
                                    }
                                }
                                handleAddStage();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500"
                            disabled={!newStageName || (stages.length > 0 && !stages[stages.length - 1]?.advancement_count)}
                        >
                            Create Stage
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete All Confirmation Dialog */}
            <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
                <DialogContent className="bg-[#0a0a0c] border border-red-500/30 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-400">Delete All Stages</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete all {stages.length} stage(s) and their bracket data? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                            <p className="text-sm text-red-300">⚠️ This will permanently delete:</p>
                            <ul className="text-sm text-gray-400 mt-2 list-disc list-inside">
                                <li>All {stages.length} tournament stages</li>
                                <li>All generated brackets</li>
                                <li>All match data for these stages</li>
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteAllDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleDeleteAllStages}
                            className="bg-red-600 hover:bg-red-500"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete All Stages'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Bracket Confirmation Dialog */}
            <Dialog open={deleteBracketDialogOpen} onOpenChange={setDeleteBracketDialogOpen}>
                <DialogContent className="bg-[#0a0a0c] border border-red-500/30 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-400">Delete Bracket?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the bracket for this stage? All match data and scores will be lost.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                            <p className="text-sm text-red-300">⚠️ This action cannot be undone.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteBracketDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={confirmDeleteStageBracket}
                            className="bg-red-600 hover:bg-red-500"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Bracket'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset All Confirmation Dialog */}
            <Dialog open={resetAllDialogOpen} onOpenChange={setResetAllDialogOpen}>
                <DialogContent className="bg-[#0a0a0c] border border-yellow-500/30 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-yellow-400">Reset All Stages</DialogTitle>
                        <DialogDescription>
                            This will clear all brackets and reset stage statuses, but keep your stage configuration.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                            <p className="text-sm text-yellow-300">⚠️ This will reset:</p>
                            <ul className="text-sm text-gray-400 mt-2 list-disc list-inside">
                                <li>All generated brackets</li>
                                <li>All match results and scores</li>
                                <li>All team advancements between stages</li>
                                <li>All stage statuses (back to 'upcoming')</li>
                            </ul>
                            <p className="text-sm text-green-400 mt-3">✓ Your stage configuration will be preserved</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetAllDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleResetAllStages}
                            className="bg-yellow-600 hover:bg-yellow-500"
                            disabled={isResetting}
                        >
                            {isResetting ? 'Resetting...' : 'Reset All Stages'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <StageSetupWizard
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                tournamentId={tournamentId}
                game={game}
                existingStages={stages}
                onComplete={onUpdate}
            />
        </>
    );
};




