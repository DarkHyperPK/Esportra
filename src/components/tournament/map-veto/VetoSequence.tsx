import React, { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { VetoHistoryEntry } from '@/hooks/useVetoHistory';
import type { VetoStepDto } from '@/types/veto';
import type { GameMap, MatchMapVeto } from '@/hooks/useMapVetoMachine';
import { getSideFullLabel, getVetoActionClasses, getVetoActionNoun } from './vetoActionPresentation';
import { buildVetoSequenceItems, type VetoSequenceItem } from './buildVetoSequenceItems';
import { VetoMapArt } from './VetoMapArt';

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
    /** `track` is the horizontal broadcast strip; `list` is a scoreboard of rows. */
    variant?: 'list' | 'track';
}

const ARRIVE_EASE = [0.2, 0, 0, 1] as const;

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

const TrackStep: React.FC<{ item: VetoSequenceItem; index: number }> = ({ item, index }) => {
    const reduceMotion = useReducedMotion();
    const isCurrent = item.status === 'current';
    const isDone = item.status === 'done';
    const showArt = Boolean(item.mapName) && (isDone || isCurrent);

    return (
        <motion.li
            data-current={isCurrent || undefined}
            aria-current={isCurrent ? 'step' : undefined}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: ARRIVE_EASE, delay: reduceMotion ? 0 : Math.min(index, 6) * 0.035 }}
            className={cn(
                'relative flex min-w-[8.5rem] flex-1 shrink-0 flex-col bg-card',
                isCurrent && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]',
                item.status === 'upcoming' && 'bg-background',
            )}
        >
            <div className="relative h-14 overflow-hidden">
                {showArt ? (
                    <>
                        <VetoMapArt src={item.mapImageUrl} name={item.mapName ?? ''} muted={isBan(item.action)} />
                        <div className={cn('absolute inset-0', isBan(item.action) ? 'bg-black/60' : 'bg-gradient-to-t from-black/70 to-transparent')} />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:14px_14px]" />
                )}
                <span className={cn(
                    'absolute left-2 top-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em]',
                    getVetoActionClasses(item.action),
                    'bg-black/70',
                )}>
                    {getVetoActionNoun(item.action)}
                </span>
                <span className="absolute right-2 top-1.5 font-heading text-sm font-black tabular-nums text-white/50">{pad(item.actionNumber)}</span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
                <p className={cn(
                    'truncate text-[13px] font-semibold',
                    isDone ? (isBan(item.action) ? 'text-zinc-400 line-through decoration-white/25' : 'text-white') : isCurrent ? 'text-white' : 'text-zinc-600',
                )}>
                    {mapLabel(item)}
                </p>
                <p className={cn(
                    'truncate font-mono text-[9px] font-semibold uppercase tracking-[0.18em]',
                    isCurrent ? 'text-zinc-200' : 'text-zinc-500',
                )}>
                    {item.teamName}{item.side ? ` · ${getSideFullLabel(item.side)}` : ''}
                </p>
            </div>
        </motion.li>
    );
};

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
}) => {
    const trackRef = useRef<HTMLOListElement>(null);
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
    const currentStep = items.find((item) => item.status === 'current')?.actionNumber;

    useEffect(() => {
        if (variant !== 'track' || !trackRef.current) return;
        const track = trackRef.current;
        const current = track.querySelector<HTMLElement>('[data-current]');
        if (!current) return;
        const target = current.offsetLeft - track.clientWidth / 2 + current.clientWidth / 2;
        track.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }, [currentStep, variant]);

    if (loading) {
        return (
            <div className={cn(variant === 'track' ? 'flex gap-px' : 'space-y-px')} data-testid="veto-sequence-loading">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className={cn('rounded-none bg-white/[0.06]', variant === 'track' ? 'h-[6.5rem] w-[9.5rem]' : 'h-10 w-full')} />
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
        const isRecap = currentStep === undefined && items.every((item) => item.status === 'done');
        return (
            <ol
                ref={trackRef}
                className={cn(
                    'gap-px bg-white/[0.06]',
                    isRecap
                        ? 'grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] [&>li]:w-auto'
                        : 'flex overflow-x-auto overscroll-x-contain [scrollbar-width:thin]',
                    className,
                )}
                data-testid="veto-sequence"
                aria-label="Veto order"
                data-lenis-prevent
            >
                {items.map((item, index) => (
                    <TrackStep key={`${item.actionNumber}-${item.action}`} item={item} index={index} />
                ))}
            </ol>
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
