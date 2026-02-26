/**
 * useBracketRealtime - Real-time subscription hook for bracket updates
 * 
 * This hook subscribes to changes in tournament_matches table and automatically
 * invalidates the bracket query cache when updates occur. This enables live
 * updates for spectators and participants watching the bracket.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UseBracketRealtimeOptions {
    /** Tournament ID to subscribe to */
    tournamentId: string;
    /** Optional stage ID to filter updates (if not provided, subscribes to all stages) */
    stageId?: string;
    /** Whether the subscription is enabled (default: true) */
    enabled?: boolean;
    /** Optional slug for cache key (used by Brackets.tsx) */
    slug?: string;
    /** Optional callback to trigger when an update is received */
    onUpdate?: () => void;
}

/**
 * Hook that subscribes to real-time bracket updates
 * 
 * @example
 * ```tsx
 * // In Brackets.tsx
 * useBracketRealtime({ tournamentId, slug, onUpdate: refetch });
 * 
 * // In TournamentBracket.tsx
 * useBracketRealtime({ tournamentId });
 * ```
 */
export function useBracketRealtime({
    tournamentId,
    stageId,
    versionId,
    enabled = true,
    slug,
    onUpdate
}: UseBracketRealtimeOptions & { versionId?: string }) {
    const queryClient = useQueryClient();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!enabled || (!tournamentId && !versionId)) return;

        const channelName = versionId
            ? `bracket-version-${versionId}`
            : stageId
                ? `bracket-${tournamentId}-${stageId}`
                : `bracket-${tournamentId}`;

        console.log(`[useBracketRealtime] Subscribing to ${channelName}`);

        const channel = supabase.channel(channelName);

        // Subscribe to new brkt_matches if versionId is present
        if (versionId) {
            channel
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'brkt_matches',
                        filter: `version_id=eq.${versionId}` // Note: Supabase JS V2 requires correct RLS to access this via websockets
                    },
                    (payload) => {
                        console.log('[useBracketRealtime] Graph match update:', payload.eventType, payload.new);

                        // Use setQueryData for incremental updates (no full refetch)
                        if (payload.eventType === 'UPDATE' && payload.new) {
                            const updatedMatch = payload.new as any;

                            // Merge the updated match into existing graph data
                            queryClient.setQueryData(
                                ['bracket-graph', versionId],
                                (oldData: { nodes: any[]; edges: any[] } | undefined) => {
                                    if (!oldData) return oldData;
                                    return {
                                        ...oldData,
                                        nodes: oldData.nodes.map((node: any) =>
                                            node.id === updatedMatch.id ? { ...node, ...updatedMatch } : node
                                        )
                                    };
                                }
                            );
                        } else if (payload.eventType === 'INSERT' && payload.new) {
                            // For new matches (advancement), add to existing nodes
                            const newMatch = payload.new as any;
                            queryClient.setQueryData(
                                ['bracket-graph', versionId],
                                (oldData: { nodes: any[]; edges: any[] } | undefined) => {
                                    if (!oldData) return oldData;
                                    // Check if already exists
                                    if (oldData.nodes.some((n: any) => n.id === newMatch.id)) {
                                        // Update existing
                                        return {
                                            ...oldData,
                                            nodes: oldData.nodes.map((node: any) =>
                                                node.id === newMatch.id ? { ...node, ...newMatch } : node
                                            )
                                        };
                                    }
                                    // Add new
                                    return {
                                        ...oldData,
                                        nodes: [...oldData.nodes, newMatch]
                                    };
                                }
                            );
                        }

                        if (onUpdate) onUpdate();
                    }
                );
        }

        channel.subscribe((status, err) => {
            console.log(`[useBracketRealtime] Subscription status: ${status}`, err);
            // If it times out, we can try to reconnect or just wait for standard React Query refetches.
        });

        channelRef.current = channel;

        return () => {
            console.log(`[useBracketRealtime] Unsubscribing from ${channelName}`);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [tournamentId, stageId, versionId, enabled, slug, queryClient, onUpdate]);

    return {
        isSubscribed: !!channelRef.current
    };
}

export default useBracketRealtime;
