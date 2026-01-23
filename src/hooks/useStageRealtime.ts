/**
 * useStageRealtime - Real-time subscription hook for stage updates
 * 
 * This hook subscribes to changes in tournament_stages and stage_participants tables,
 * automatically updating React Query cache when changes occur.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UseStageRealtimeOptions {
    /** Tournament ID to subscribe to */
    tournamentId: string;
    /** Whether the subscription is enabled (default: true) */
    enabled?: boolean;
    /** Optional callback when stage status changes */
    onStageStatusChange?: (stageId: string, newStatus: string) => void;
}

/**
 * Hook that subscribes to real-time stage updates
 * 
 * @example
 * ```tsx
 * useStageRealtime({ 
 *   tournamentId, 
 *   onStageStatusChange: (stageId, status) => console.log(`Stage ${stageId} is now ${status}`)
 * });
 * ```
 */
export function useStageRealtime({
    tournamentId,
    enabled = true,
    onStageStatusChange
}: UseStageRealtimeOptions) {
    const queryClient = useQueryClient();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Callback for updating stage data in cache
    const updateStageInCache = useCallback((payload: any) => {
        const { eventType, new: newData, old: oldData } = payload;

        // Handle stage status changes - update cache directly instead of refetching
        if (eventType === 'UPDATE' && newData) {
            const updatedStage = newData as any;

            // Update any queries that include stages for this tournament
            queryClient.setQueriesData(
                { queryKey: ['tournament', tournamentId] },
                (oldTournamentData: any) => {
                    if (!oldTournamentData?.stages) return oldTournamentData;
                    return {
                        ...oldTournamentData,
                        stages: oldTournamentData.stages.map((stage: any) =>
                            stage.id === updatedStage.id ? { ...stage, ...updatedStage } : stage
                        )
                    };
                }
            );

            // Also invalidate specific stage queries
            queryClient.invalidateQueries({ queryKey: ['stage', updatedStage.id] });

            // Notify callback if status changed
            if (onStageStatusChange && oldData?.status !== newData?.status) {
                onStageStatusChange(updatedStage.id, updatedStage.status);
            }
        }

        // For INSERT/DELETE, just invalidate the tournament query
        if (eventType === 'INSERT' || eventType === 'DELETE') {
            queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
        }
    }, [tournamentId, queryClient, onStageStatusChange]);

    // Callback for updating stage participants in cache
    const updateParticipantsInCache = useCallback((payload: any) => {
        const { eventType, new: newData, old: oldData } = payload;

        // Get the stage_id from the payload
        const stageId = newData?.stage_id || oldData?.stage_id;

        if (stageId) {
            // Invalidate just the specific stage's participant queries
            queryClient.invalidateQueries({ queryKey: ['stage-participants', stageId] });
        }
    }, [queryClient]);

    useEffect(() => {
        if (!enabled || !tournamentId) return;

        const channelName = `stage-realtime-${tournamentId}`;

        console.log(`[useStageRealtime] Subscribing to ${channelName}`);

        const channel = supabase
            .channel(channelName)
            // Subscribe to stage changes
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tournament_stages',
                    filter: `tournament_id=eq.${tournamentId}`
                },
                (payload) => {
                    console.log('[useStageRealtime] Stage update:', payload.eventType);
                    updateStageInCache(payload);
                }
            )
            // Subscribe to stage participants changes
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'stage_participants'
                },
                (payload) => {
                    console.log('[useStageRealtime] Participant update:', payload.eventType);
                    updateParticipantsInCache(payload);
                }
            )
            // Subscribe to bracket version changes (for bracket exists status)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'brkt_versions',
                    filter: `tournament_id=eq.${tournamentId}`
                },
                (payload) => {
                    console.log('[useStageRealtime] Bracket version update:', payload.eventType);
                    // Invalidate hasBrackets checks
                    queryClient.invalidateQueries({ queryKey: ['bracket-versions', tournamentId] });
                }
            )
            .subscribe((status) => {
                console.log(`[useStageRealtime] Subscription status: ${status}`);
            });

        channelRef.current = channel;

        return () => {
            console.log(`[useStageRealtime] Unsubscribing from ${channelName}`);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [tournamentId, enabled, updateStageInCache, updateParticipantsInCache, queryClient]);

    return {
        isSubscribed: !!channelRef.current
    };
}

export default useStageRealtime;
