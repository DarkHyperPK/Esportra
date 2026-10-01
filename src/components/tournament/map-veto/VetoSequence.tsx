import React, { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { VetoHistoryEntry } from '@/hooks/useVetoHistory';
import type { VetoStepDto } from '@/types/veto';
import type { GameMap, MatchMapVeto } from '@/hooks/useMapVetoMachine';
import { getSideFullLabel, getVetoActionClasses, getVetoActionNoun } from './vetoActionPresentation';
import { buildVetoSequenceItems, type VetoSequenceItem } from './buildVetoSequenceItems';
import { VetoLaneTrack } from './VetoLaneTrack';

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
    /** Kept for API compatibility with older two-column layouts. */
    columns?: boolean;
    className?: string;
    emptyMessage?: string;
    externalSequence?: VetoStepDto[];
    /** `track` is the two-lane broadcast duel; `list` is a scoreboard of rows. */
    variant?: 'list' | 'track';
    team1Logo?: string | null;
    team2Logo?: string | null;
}


function pad(value: number) {
    return String(value).padStart(2, '0');
}

function isBan(action: string) {
    return action === 'ban' || action === 'ignore';
}

function mapLabel(item: VetoSequenceItem) {
    if (item.mapName) return item.mapName;
    return item.status === 'done' ? 'Map not recorded' : '';
}

const ListRow: React.FC<{ item: VetoSequenceItem; compact: boolean }> = ({ item, compact }) => {
    const isCurrent = item.status === 'current';
    return (
        <li
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
                'grid grid-cols-[2rem_4.25rem_minmax(0,1fr)_auto] items-center gap-3 bg-card px-3',
                compact ? 'py-2' : 'py-2.5',
                isCurrent && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]',
                item.status === 'upcoming' && 'bg-background',
            )}
        >
            <span className="font-heading text-sm font-black tabular-nums text-zinc-500">{pad(item.actionNumber)}</span>
            <span className={cn('px-1.5 py-0.5 text-center font-mono text-[9px] font-bold uppercase tracking-[0.18em]', getVetoActionClasses(item.action))}>
                {getVetoActionNoun(item.action)}
            </span>
            <span className={cn('truncate text-[13px]', item.status === 'upcoming' ? 'text-zinc-600' : 'text-zinc-300')}>
                {item.teamName}
            </span>
            <span className={cn(
                'truncate text-right text-[13px] font-semibold',
                item.status === 'done'
                    ? (isBan(item.action) ? 'text-zinc-500 line-through decoration-white/20' : 'text-white')
                    : 'text-zinc-600',
            )}>
                {mapLabel(item)}
                {item.side ? <span className="ml-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{getSideFullLabel(item.side)}</span> : null}
            </span>
        </li>
    );
};

export const VetoSequence: React.FC<VetoSequenceProps> = ({
    veto,
    entries,
    loading = false,
    bestOf,
    team1Name,
    team2Name,
    team1Id,
    team2Id,
    availableMaps,
    allAvailableMaps,
    game,
    compact = false,
    doneOnly = false,
    className,
    emptyMessage = 'No veto actions recorded yet.',
    externalSequence,
    variant = 'list',
    team1Logo,
    team2Logo,
}) => {
    const items = useMemo(
        () => buildVetoSequenceItems({
            veto,
            entries,
            bestOf,
            team1Name,
            team2Name,
            team1Id,
            team2Id,
            availableMaps,
            allAvailableMaps,
            game,
            doneOnly,
            externalSequence,
        }),
        [allAvailableMaps, availableMaps, bestOf, doneOnly, entries, externalSequence, game, team1Id, team1Name, team2Id, team2Name, veto],
    );

    if (loading) {
        return (
            <div className={cn(variant === 'track' ? 'flex gap-2' : 'space-y-px')} data-testid="veto-sequence-loading">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className={cn('rounded-none bg-white/[0.06]', variant === 'track' ? 'h-[17rem] flex-1' : 'h-10 w-full')} />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <p className="border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500" data-testid="veto-sequence-empty">
                {emptyMessage}
            </p>
        );
    }

    if (variant === 'track') {
        return (
            <VetoLaneTrack
                items={items}
                team1Name={team1Name}
                team2Name={team2Name}
                team1Logo={team1Logo}
                team2Logo={team2Logo}
                className={className}
            />
        );
    }

    return (
        <ol className={cn('grid gap-px bg-white/[0.06]', className)} data-testid="veto-sequence" aria-label="Veto order">
            {items.map((item) => (
                <ListRow key={`${item.actionNumber}-${item.action}`} item={item} compact={compact} />
            ))}
        </ol>
    );
};

export default VetoSequence;
