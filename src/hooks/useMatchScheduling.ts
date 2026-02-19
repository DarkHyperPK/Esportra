import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SchedulingConfig {
    self_play_enabled: boolean;
    checkin_enabled: boolean;
    checkin_window_minutes: number;
    round_deadline: string | null;
    round_deadlines?: Record<string, string>; // Map of round_index to deadline ISO string
    schedule_start_time: string | null;
    match_interval_minutes: number;
    daily_start_time?: string; // HH:mm format, default time for daily rounds (Swiss/RR)
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
    const { data: schedulingConfig, isLoading: configLoading } = useQuery({
        queryKey: ['stage-scheduling-config', stageId],
        queryFn: async () => {
            if (!stageId) return null;
            const { data, error } = await supabase
                .from('tournament_stages')
                .select('scheduling_config')
                .eq('id', stageId)
                .single();
            if (error) throw error;
            return data?.scheduling_config as SchedulingConfig;
        },
        enabled: !!stageId,
    });

    // Fetch matches for a stage/version to schedule
    const { data: matches, isLoading: matchesLoading } = useQuery({
        queryKey: ['stage-matches-for-scheduling', stageId],
        queryFn: async () => {
            if (!stageId) return [];
            // Get version for this stage
            const { data: version, error: versionError } = await supabase
                .from('brkt_versions')
                .select('id')
                .eq('stage_id', stageId)
                .single();

            if (versionError || !version) return [];

            const { data, error } = await supabase
                .from('brkt_matches')
                .select('id, match_number, scheduled_time, team1_id, team2_id, status, round_index, bracket_type')
                .eq('version_id', version.id)
                .order('round_index', { ascending: true })
                .order('match_number', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!stageId,
    });

    // Update scheduling config
    const updateConfig = useMutation({
        mutationFn: async (config: Partial<SchedulingConfig>) => {
            if (!stageId) throw new Error('Stage ID required');
            const { error } = await supabase
                .from('tournament_stages')
                .update({ scheduling_config: config })
                .eq('id', stageId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-scheduling-config', stageId] });
            toast({ title: 'Config Updated', description: 'Scheduling settings saved.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Apply interval-based scheduling to all matches
    const applyIntervalSchedule = useMutation({
        mutationFn: async ({ startTime, intervalMinutes }: { startTime: Date; intervalMinutes: number }) => {
            if (!matches || matches.length === 0) throw new Error('No matches to schedule');

            // Group matches by round
            const matchesByRound = matches.reduce((acc: Record<number, typeof matches>, match) => {
                const round = match.round_index;
                if (!acc[round]) acc[round] = [];
                acc[round].push(match);
                return acc;
            }, {});

            const updates: MatchSchedule[] = [];
            let currentTime = new Date(startTime);

            // Schedule matches round by round
            const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

            for (const round of rounds) {
                const roundMatches = matchesByRound[round];
                for (const match of roundMatches) {
                    updates.push({
                        matchId: match.id,
                        scheduledTime: currentTime.toISOString(),
                        matchNumber: match.match_number,
                    });
                    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
                }
            }

            // Batch update all matches
            for (const update of updates) {
                const { error } = await supabase
                    .from('brkt_matches')
                    .update({ scheduled_time: update.scheduledTime })
                    .eq('id', update.matchId);
                if (error) throw error;
            }

            return updates;
        },
        onSuccess: (updates) => {
            queryClient.invalidateQueries({ queryKey: ['stage-matches-for-scheduling', stageId] });
            toast({
                title: 'Schedule Applied',
                description: `${updates.length} matches scheduled successfully.`
            });
        },
        onError: (error: any) => {
            toast({ title: 'Scheduling Failed', description: error.message, variant: 'destructive' });
        },
    });

    // Update single match time
    const updateMatchTime = useMutation({
        mutationFn: async ({ matchId, scheduledTime }: { matchId: string; scheduledTime: string | null }) => {
            const { error } = await supabase
                .from('brkt_matches')
                .update({ scheduled_time: scheduledTime })
                .eq('id', matchId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-matches-for-scheduling', stageId] });
            toast({ title: 'Match Time Updated' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Generate preview of schedule without saving
    const generateSchedulePreview = (startTime: Date, intervalMinutes: number): MatchSchedule[] => {
        if (!matches || matches.length === 0) return [];

        const matchesByRound = matches.reduce((acc: Record<number, typeof matches>, match) => {
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
