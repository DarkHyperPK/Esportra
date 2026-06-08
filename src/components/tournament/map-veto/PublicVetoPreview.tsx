import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { mapApiVetoToLocal } from '@/hooks/useMapVetoMachine';
import { normalizeHistoryEntry, type VetoHistoryEntry } from '@/hooks/useVetoHistory';
import { VetoHistoryTimeline } from './VetoHistoryTimeline';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PublicVetoPreviewProps {
    matchId: string;
    team1Name?: string;
    team2Name?: string;
    enabled?: boolean;
}

function usePublicVeto(matchId: string, enabled: boolean) {
    const cleanedId = matchId.replace(/^(db-|wb-|lb-|source-)/, '');
    return useQuery({
        queryKey: ['public-veto', cleanedId],
        queryFn: async () => {
            try {
                const data = await apiClient.get<Record<string, unknown>>(`/api/public/veto/${cleanedId}`);
                return mapApiVetoToLocal(data);
            } catch {
                return null;
            }
        },
        enabled: enabled && Boolean(cleanedId),
        staleTime: 30_000,
    });
}

function usePublicVetoHistory(matchId: string, enabled: boolean) {
    const cleanedId = matchId.replace(/^(db-|wb-|lb-|source-)/, '');
    return useQuery({
        queryKey: ['public-veto-history', cleanedId],
        queryFn: async (): Promise<VetoHistoryEntry[]> => {
            try {
                const data = await apiClient.get<unknown>(`/api/public/veto/${cleanedId}/history`);
                const rows = Array.isArray(data) ? data : [];
                return rows
                    .map((row) => normalizeHistoryEntry(row as Record<string, unknown>))
                    .sort((a, b) => a.actionNumber - b.actionNumber);
            } catch {
                return [];
            }
        },
        enabled: enabled && Boolean(cleanedId),
        staleTime: 30_000,
    });
}

export const PublicVetoPreview: React.FC<PublicVetoPreviewProps> = ({
    matchId,
    team1Name = 'Team 1',
    team2Name = 'Team 2',
    enabled = true,
}) => {
    const { data: veto, isLoading: vetoLoading } = usePublicVeto(matchId, enabled);
    const { data: history = [], isLoading: historyLoading } = usePublicVetoHistory(matchId, enabled && Boolean(veto));

    if (vetoLoading) {
        return (
            <div className="space-y-3" data-testid="public-veto-preview-loading">
                <Skeleton className="h-6 w-32 bg-white/10" />
                <Skeleton className="h-20 w-full bg-white/10" />
            </div>
        );
    }

    if (!veto) {
        return (
            <p className="text-sm text-zinc-500 py-2" data-testid="public-veto-empty">
                No map veto recorded yet.
            </p>
        );
    }

    const boText = `BO${veto.best_of || 1}`;
    const statusLabel = veto.status === 'in_progress'
        ? 'In Progress'
        : veto.status === 'completed'
            ? 'Completed'
            : veto.status === 'pending'
                ? 'Pending'
                : veto.status;

    const currentTeam = veto.current_team_id === veto.team1_id ? team1Name : team2Name;

    return (
        <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-3" data-testid="public-veto-preview">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-white uppercase tracking-widest">Map Veto</span>
                <Badge className="bg-white/10 text-white text-[10px] border border-white/20">{boText}</Badge>
                <Badge className={cn(
                    'text-[10px] border',
                    veto.status === 'in_progress'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-white/5 text-zinc-400 border-white/10',
                )}>{statusLabel}</Badge>
            </div>

            {veto.status === 'in_progress' && veto.current_action && (
                <p className="text-xs text-zinc-400">
                    Action {veto.current_action_number}: {currentTeam} — {veto.current_action.replace('_', ' ')}
                </p>
            )}

            {veto.status === 'completed' && veto.selected_map_id && (
                <p className="text-xs text-zinc-300">
                    Decider map selected.
                </p>
            )}

            <VetoHistoryTimeline
                entries={history}
                loading={historyLoading}
                compact
                emptyMessage="No veto actions recorded yet."
            />
        </div>
    );
};

export default PublicVetoPreview;
