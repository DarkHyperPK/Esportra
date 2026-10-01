import React from 'react';
import { usePublicVeto, usePublicVetoHistory } from '@/hooks/usePublicVeto';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/kit';
import { VetoSequence } from './VetoSequence';
import { VetoLineup } from './VetoLineup';
import { buildVetoSelectedMapEntries, type VetoMapLookupEntry } from './buildVetoSelectedMapEntries';
import { getVetoSpectatorLine } from './vetoActionPresentation';
import type { VetoHistoryEntry } from '@/hooks/useVetoHistory';

interface PublicVetoPreviewProps {
    matchId: string;
    team1Name?: string;
    team2Name?: string;
    enabled?: boolean;
}

function lookupFromHistory(history: VetoHistoryEntry[]): VetoMapLookupEntry[] {
    const lookup = new Map<string, VetoMapLookupEntry>();
    history.forEach((entry) => {
        if (entry.mapId && !lookup.has(entry.mapId)) {
            lookup.set(entry.mapId, { id: entry.mapId, map_name: entry.mapName, map_image_url: entry.mapImageUrl });
        }
    });
    return Array.from(lookup.values());
}

/** Spectator view of a match's veto: the maps that will be played, then how they were chosen. */
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
            <div className="space-y-px" data-testid="public-veto-preview-loading">
                <Skeleton className="h-24 w-full rounded-none bg-white/[0.05]" />
                <Skeleton className="h-10 w-full rounded-none bg-white/[0.04]" />
            </div>
        );
    }

    if (!veto) {
        return (
            <p className="border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500" data-testid="public-veto-empty">
                No map veto for this match yet.
            </p>
        );
    }

    const bestOf = veto.best_of || 1;
    const isLive = veto.status === 'in_progress';
    const isComplete = veto.status === 'completed';
    const currentTeam = veto.current_team_id === veto.team1_id ? team1Name : team2Name;
    const entries = buildVetoSelectedMapEntries({
        veto,
        bestOf,
        game: veto.game || 'valorant',
        mapLookup: lookupFromHistory(history),
        team1Name,
        team2Name,
    });

    return (
        <div className="space-y-4" data-testid="public-veto-preview">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-300">
                    {isLive && veto.current_action
                        ? `${getVetoSpectatorLine(currentTeam, veto.current_action)}.`
                        : isComplete
                            ? `Veto done. ${entries.length === 1 ? 'One map' : `${entries.length} maps`} to play.`
                            : 'The veto hasn’t started.'}
                </p>
                <StatusPill
                    label={isLive ? 'In progress' : isComplete ? 'Complete' : 'Not started'}
                    tone={isComplete ? 'success' : 'neutral'}
                />
            </div>

            {(isLive || isComplete) ? <VetoLineup entries={entries} bestOf={bestOf} variant="rail" /> : null}

            <VetoSequence
                veto={veto}
                entries={history}
                loading={historyLoading}
                bestOf={bestOf}
                team1Name={team1Name}
                team2Name={team2Name}
                team1Id={veto.team1_id}
                team2Id={veto.team2_id}
                game={veto.game || 'valorant'}
                compact
                doneOnly={isComplete}
                emptyMessage="No veto steps recorded yet."
            />
        </div>
    );
};

export default PublicVetoPreview;
