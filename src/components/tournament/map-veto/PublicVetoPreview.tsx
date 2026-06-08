import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { mapApiVetoToLocal } from '@/hooks/useMapVetoMachine';
import { normalizeHistoryEntry, type VetoHistoryEntry } from '@/hooks/useVetoHistory';
import { VetoSequence } from './VetoSequence';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getVetoActionClasses, getVetoActionNoun } from './vetoActionPresentation';
import { buildVetoSelectedMapEntries } from './buildVetoSelectedMapEntries';

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

    const mapLookup = Array.from(
        history.reduce((lookup, entry) => {
            if (entry.mapId && !lookup.has(entry.mapId)) {
                lookup.set(entry.mapId, {
                    id: entry.mapId,
                    map_name: entry.mapName,
                    map_image_url: entry.mapImageUrl,
                });
            }
            return lookup;
        }, new Map<string, { id: string; map_name: string; map_image_url?: string | null }>()).values(),
    );

    const selectedEntries = buildVetoSelectedMapEntries({
        veto,
        bestOf: veto.best_of || 1,
        game: veto.game || 'valorant',
        mapLookup,
        team1Name,
        team2Name,
    });

    return (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-4" data-testid="public-veto-preview">
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
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest', getVetoActionClasses(veto.current_action))}>
                        {getVetoActionNoun(veto.current_action)}
                    </span>
                    <span className="text-xs font-semibold text-zinc-300">
                        {currentTeam}'s turn
                    </span>
                </div>
            )}

            {selectedEntries.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                    {selectedEntries.map((entry) => (
                        <div key={`${entry.mapNumber}-${entry.map_id}`} className="overflow-hidden rounded-lg border border-emerald-500/30 bg-black">
                            <div
                                className="h-24 bg-cover bg-center"
                                style={{
                                    backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.2)), url(${entry.map_image_url || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80'})`,
                                }}
                            >
                                <div className="flex h-full flex-col justify-end p-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Map {entry.mapNumber}</span>
                                    <span className="text-sm font-black text-white">{entry.map_name}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <VetoSequence
                veto={veto}
                entries={history}
                loading={historyLoading}
                bestOf={veto.best_of || 1}
                team1Name={team1Name}
                team2Name={team2Name}
                team1Id={veto.team1_id}
                team2Id={veto.team2_id}
                game={veto.game || 'valorant'}
                compact={false}
                doneOnly={veto.status === 'completed'}
                emptyMessage="No veto actions recorded yet."
            />
        </div>
    );
};

export default PublicVetoPreview;
