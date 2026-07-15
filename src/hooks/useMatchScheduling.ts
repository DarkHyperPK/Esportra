import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

export interface SchedulingConfig {
    self_play_enabled?: boolean;
    selfPlayEnabled?: boolean;
    checkin_enabled?: boolean;
    checkinEnabled?: boolean;
    checkin_window_minutes?: number;
    checkinWindowMinutes?: number;
    round_deadline?: string | null;
    roundDeadline?: string | null;
    round_deadlines?: Record<string, string>;
    roundDeadlines?: Record<string, string>;
    schedule_start_time?: string | null;
    scheduleStartTime?: string | null;
    match_interval_minutes?: number;
    matchIntervalMinutes?: number;
    daily_start_time?: string;
    dailyStartTime?: string;
    scheduling_mode?: 'round_based' | 'granular';
    schedulingMode?: 'round_based' | 'granular';
}

export const stageSchedulingConfigQueryKey = (stageId: string | undefined) =>
    ['stage-scheduling-config', stageId] as const;

interface StageMatch {
    id: string;
    match_number: number;
    scheduled_time: string | null;
    team1_id: string | null;
    team2_id: string | null;
    status: string;
    round_index: number;
    bracket_type: string;
    team1_name: string | null;
    team2_name: string | null;
}

interface MatchSchedule {
    matchId: string;
    scheduledTime: string;
    matchNumber: number;
}

export const useMatchScheduling = (stageId: string | undefined) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch stage scheduling config
    const { data: schedulingConfig, isLoading: configLoading } = useQuery<SchedulingConfig | null>({
        queryKey: stageSchedulingConfigQueryKey(stageId),
        queryFn: () => apiClient.get<SchedulingConfig>(`/api/stages/${stageId}/scheduling-config`),
        enabled: !!stageId,
        staleTime: 0,
    });

    // Fetch matches for a stage to schedule
    const { data: matches, isLoading: matchesLoading } = useQuery<StageMatch[]>({
        queryKey: ['stage-matches-for-scheduling', stageId],
        queryFn: () => apiClient.get<StageMatch[]>(`/api/stages/${stageId}/matches`),
        enabled: !!stageId,
    });

    // Update scheduling config
    const updateConfig = useMutation({
        mutationFn: async (config: SchedulingConfig) => {
            if (!stageId) throw new Error('Stage ID required');
            return apiClient.put(`/api/stages/${stageId}/scheduling-config`, config);
        },
        onMutate: async (config) => {
            if (!stageId) return;
            await queryClient.cancelQueries({ queryKey: stageSchedulingConfigQueryKey(stageId) });
            const previous = queryClient.getQueryData<SchedulingConfig | null>(
                stageSchedulingConfigQueryKey(stageId),
            );
            queryClient.setQueryData(stageSchedulingConfigQueryKey(stageId), config);
            return { previous };
        },
        onSuccess: (_data, config) => {
            if (stageId) {
                queryClient.setQueryData(stageSchedulingConfigQueryKey(stageId), config);
            }
            queryClient.invalidateQueries({ queryKey: ['tournament-stages'] });
            // SignalR StageUpdated also fan-outs to other clients; local cache is already fresh.
        },
        onError: (error: Error, _config, context) => {
            if (stageId && context?.previous !== undefined) {
                queryClient.setQueryData(stageSchedulingConfigQueryKey(stageId), context.previous);
            }
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Apply interval-based scheduling to all matches
    const applyIntervalSchedule = useMutation({
        mutationFn: async ({ startTime, intervalMinutes }: { startTime: Date; intervalMinutes: number }) => {
            if (!matches || matches.length === 0) throw new Error('No matches to schedule');

            // Group matches by round
            const matchesByRound = matches.reduce((acc: Record<number, StageMatch[]>, match) => {
                const round = match.round_index;
                if (!acc[round]) acc[round] = [];
                acc[round].push(match);
                return acc;
            }, {});

            const updates: { matchId: string; scheduledTime: string }[] = [];
            let currentTime = new Date(startTime);

            const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

            for (const round of rounds) {
                const roundMatches = matchesByRound[round];
                for (const match of roundMatches) {
                    updates.push({
                        matchId: match.id,
                        scheduledTime: currentTime.toISOString(),
                    });
                    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
                }
            }

            // Single bulk update via .NET API
            return apiClient.post(`/api/stages/${stageId}/schedule-bulk`, { updates });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-matches-for-scheduling', stageId] });
            toast({
                title: 'Schedule Applied',
                description: 'All matches scheduled successfully.',
            });
        },
        onError: (error: Error) => {
            toast({ title: 'Scheduling Failed', description: error.message, variant: 'destructive' });
        },
    });

    // Update single match time
    const updateMatchTime = useMutation({
        mutationFn: async ({ matchId, scheduledTime }: { matchId: string; scheduledTime: string | null }) => {
            return apiClient.put(`/api/matches/${matchId}/scheduled-time`, { scheduledTime });
        },
        onMutate: async ({ matchId, scheduledTime }) => {
            await queryClient.cancelQueries({ queryKey: ['stage-matches-for-scheduling', stageId] });
            const previousMatches = queryClient.getQueryData(['stage-matches-for-scheduling', stageId]);

            // Optimistic update on scheduling list
            queryClient.setQueryData(['stage-matches-for-scheduling', stageId], (old: StageMatch[] | undefined) => {
                if (!old) return old;
                return old.map((m) => m.id === matchId ? { ...m, scheduled_time: scheduledTime } : m);
            });

            // Optimistic update on bracket graph data
            const graphQueries = queryClient.getQueriesData({ queryKey: ['bracket-graph'] });
            const legacyGraphQueries = queryClient.getQueriesData({ queryKey: ['bracket-graph-data'] });

            [...graphQueries, ...legacyGraphQueries].forEach(([queryKey, oldData]) => {
                if (oldData) {
                    queryClient.setQueryData(queryKey, (old: any) => {
                        if (!old || !old.nodes) return old;
                        return {
                            ...old,
                            nodes: old.nodes.map((node: any) =>
                                node.id === matchId ? { ...node, scheduled_time: scheduledTime } : node
                            ),
                        };
                    });
                }
            });

            return { previousMatches };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-matches-for-scheduling', stageId] });
            queryClient.invalidateQueries({ queryKey: ['bracket-graph'] });
            queryClient.invalidateQueries({ queryKey: ['bracket-graph-data', stageId] });
            queryClient.invalidateQueries({ queryKey: ['public-tournament'] });
            toast({ title: 'Match Time Updated' });
        },
        onError: (error: Error, _variables, context) => {
            if (context?.previousMatches) {
                queryClient.setQueryData(['stage-matches-for-scheduling', stageId], context.previousMatches);
            }
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Generate preview of schedule without saving
    const generateSchedulePreview = (startTime: Date, intervalMinutes: number): MatchSchedule[] => {
        if (!matches || matches.length === 0) return [];

        const matchesByRound = matches.reduce((acc: Record<number, StageMatch[]>, match) => {
            const round = match.round_index;
            if (!acc[round]) acc[round] = [];
            acc[round].push(match);
            return acc;
        }, {});

        const preview: MatchSchedule[] = [];
        let currentTime = new Date(startTime);

        const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

        for (const round of rounds) {
            const roundMatches = matchesByRound[round];
            for (const match of roundMatches) {
                preview.push({
                    matchId: match.id,
                    scheduledTime: currentTime.toISOString(),
                    matchNumber: match.match_number,
                });
                currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
            }
        }

        return preview;
    };

    return {
        schedulingConfig,
        matches,
        isLoading: configLoading || matchesLoading,
        updateConfig,
        applyIntervalSchedule,
        updateMatchTime,
        generateSchedulePreview,
    };
};
