import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { VetoHistoryEntry } from '@/hooks/useVetoHistory';
import {
    getBestOf,
    getSidePickerTeam,
    getTeamForAction,
    getVetoFormat,
    MatchMapVeto,
    VetoService,
    type GameMap,
} from '@/hooks/useMapVetoMachine';
import {
    getSideShortLabel,
    getVetoActionClasses,
    getVetoActionLabel,
    getVetoActionNoun,
    type VetoActionKind,
} from './vetoActionPresentation';

interface VetoSequenceProps {
    veto?: MatchMapVeto | null;
    entries: VetoHistoryEntry[];
    loading?: boolean;
    bestOf: number;
    team1Name: string;
    team2Name: string;
    team1Id?: string | null;
    team2Id?: string | null;
    availableMaps?: GameMap[];
    allAvailableMaps?: GameMap[];
    game?: string;
    compact?: boolean;
    doneOnly?: boolean;
    columns?: boolean;
    className?: string;
    emptyMessage?: string;
}

interface SequenceItem {
    actionNumber: number;
    action: VetoActionKind;
    teamName: string;
    mapName?: string;
    mapImageUrl?: string | null;
    side?: 'attack' | 'defend' | null;
    status: 'done' | 'current' | 'upcoming';
}

const fallbackMapImage = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80';

function normalizeBannedMaps(bannedMaps: unknown): string[] {
    if (!bannedMaps) return [];
    if (Array.isArray(bannedMaps)) return bannedMaps.filter((id): id is string => typeof id === 'string');
    if (typeof bannedMaps === 'string') {
        try {
            const parsed = JSON.parse(bannedMaps);
            return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [bannedMaps];
        } catch {
            return [bannedMaps];
        }
    }
    return [];
}

function getEntryForStep(entries: VetoHistoryEntry[], actionNumber: number) {
    return entries.find((entry) => entry.actionNumber === actionNumber);
}

export const VetoSequence: React.FC<VetoSequenceProps> = ({
    veto,
    entries,
    loading = false,
    bestOf,
    team1Name,
    team2Name,
    team1Id,
    team2Id,
    availableMaps = [],
    allAvailableMaps = [],
    game = 'valorant',
    compact = false,
    doneOnly = false,
    columns = false,
    className,
    emptyMessage = 'No veto actions recorded yet.',
}) => {
    const reduceMotion = useReducedMotion();
    const sequenceItems = useMemo<SequenceItem[]>(() => {
        const entryItems = entries.map((entry) => ({
            actionNumber: entry.actionNumber,
            action: entry.action,
            teamName: entry.teamName,
            mapName: entry.mapName,
            mapImageUrl: entry.mapImageUrl,
            side: entry.side,
            status: 'done' as const,
        }));

        if (!veto || doneOnly || veto.status === 'completed') {
            return entryItems;
        }

        const mapLookup = allAvailableMaps.length > 0 ? allAvailableMaps : availableMaps;
        const service = new VetoService(game, mapLookup.length || undefined);
        const currentBestOf = getBestOf(bestOf || veto.best_of);
        const sequence = service.getSequence(getVetoFormat(currentBestOf));
        const effectiveTeam1Id = veto.team1_id || team1Id || 'team1';
        const effectiveTeam2Id = veto.team2_id || team2Id || 'team2';
        const usedMapIds = new Set([
            ...normalizeBannedMaps(veto.team1_banned_maps),
            ...normalizeBannedMaps(veto.team2_banned_maps),
            ...(veto.team1_picked_maps || []).map((picked) => picked.map_id),
            ...(veto.team2_picked_maps || []).map((picked) => picked.map_id),
        ]);

        return sequence.map((step) => {
            const historyEntry = getEntryForStep(entries, step.actionNumber);
            if (historyEntry) {
                return {
                    actionNumber: historyEntry.actionNumber,
                    action: historyEntry.action,
                    teamName: historyEntry.teamName,
                    mapName: historyEntry.mapName,
                    mapImageUrl: historyEntry.mapImageUrl,
                    side: historyEntry.side,
                    status: 'done' as const,
                };
            }

            const teamId = step.action === 'pick_side'
                ? getSidePickerTeam(step.actionNumber, currentBestOf, effectiveTeam1Id, effectiveTeam2Id, service)
                : getTeamForAction(step.actionNumber, currentBestOf, effectiveTeam1Id, effectiveTeam2Id, service);
            const previousEntry = entries.find((entry) => entry.actionNumber === step.actionNumber - 1);
            const deciderMap = step.isDecider
                ? mapLookup.find((map) => !usedMapIds.has(map.id))
                : undefined;
            const status = veto.current_action_number === step.actionNumber ? 'current' : 'upcoming';

            return {
                actionNumber: step.actionNumber,
                action: step.action as VetoActionKind,
                teamName: teamId === effectiveTeam1Id ? team1Name : team2Name,
                mapName: step.action === 'pick_side'
                    ? previousEntry?.mapName || deciderMap?.map_name
                    : deciderMap?.map_name,
                mapImageUrl: step.action === 'pick_side'
                    ? previousEntry?.mapImageUrl || deciderMap?.map_image_url
                    : deciderMap?.map_image_url,
                status,
            };
        });
    }, [allAvailableMaps, availableMaps, bestOf, doneOnly, entries, game, team1Id, team1Name, team2Id, team2Name, veto]);

    if (loading) {
        return (
            <div className="space-y-3" data-testid="veto-sequence-loading">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className={cn('w-full rounded-xl bg-white/10', compact ? 'h-14' : 'h-20')} />
                ))}
            </div>
        );
    }

    if (sequenceItems.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-zinc-500" data-testid="veto-sequence-empty">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div
            className={cn(
                'grid gap-3',
                columns && '2xl:grid-cols-2',
                className,
            )}
            data-testid="veto-sequence"
        >
            {sequenceItems.map((item, index) => {
                const isResolved = item.status === 'done';
                const isCurrent = item.status === 'current';
                const actionText = getVetoActionLabel(item.action, item.side);
                const mapName = item.mapName || (item.status === 'upcoming' ? 'map pending' : 'selected map');
                const imageUrl = item.mapImageUrl || (isResolved ? fallbackMapImage : null);

                return (
                    <motion.div
                        key={`${item.actionNumber}-${item.action}-${item.mapName || item.status}`}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={{ delay: reduceMotion ? 0 : index * 0.025 }}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={cn(
                            'group relative overflow-hidden rounded-xl border bg-[#09090b]/80',
                            compact ? 'p-2.5' : 'p-3 sm:p-4',
                            isCurrent
                                ? 'border-rose-500/70 shadow-[0_0_0_1px_rgba(244,63,94,0.2),0_18px_50px_rgba(0,0,0,0.35)]'
                                : 'border-white/10',
                            item.status === 'upcoming' && 'opacity-60',
                        )}
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <div className={cn(
                                'flex shrink-0 items-center justify-center rounded-lg font-black tabular-nums',
                                compact ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm',
                                getVetoActionClasses(item.action),
                            )}>
                                {item.actionNumber}.
                            </div>

                            {imageUrl && (
                                <div
                                    className={cn(
                                        'shrink-0 rounded-lg border border-white/10 bg-cover bg-center shadow-inner',
                                        compact ? 'h-12 w-20' : 'h-16 w-28',
                                    )}
                                    style={{ backgroundImage: `url(${imageUrl})` }}
                                    role="img"
                                    aria-label={mapName}
                                />
                            )}

                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                    <span className={cn(
                                        'rounded-full px-2 py-0.5 font-black tracking-widest',
                                        compact ? 'text-[9px]' : 'text-[10px]',
                                        getVetoActionClasses(item.action),
                                    )}>
                                        {getVetoActionNoun(item.action)}
                                    </span>
                                    {isCurrent && (
                                        <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-200">
                                            Current
                                        </span>
                                    )}
                                    {item.side && (
                                        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-black tracking-widest text-white">
                                            {getSideShortLabel(item.side)}
                                        </span>
                                    )}
                                </div>
                                <p className={cn('min-w-0 font-semibold leading-snug text-white', compact ? 'text-xs' : 'text-sm sm:text-base')}>
                                    <span>{item.teamName}</span>{' '}
                                    <span className="text-white/55">{actionText}</span>{' '}
                                    <span className={cn(getVetoActionClasses(item.action, 'text'))}>
                                        {mapName}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default VetoSequence;
