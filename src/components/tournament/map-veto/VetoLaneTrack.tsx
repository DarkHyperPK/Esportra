import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { VetoSequenceItem } from './buildVetoSequenceItems';
import { VetoMapArt } from './VetoMapArt';
import { VetoCrest } from './VetoCrest';
import { getSideShortLabel, getVetoActionNoun } from './vetoActionPresentation';

interface VetoLaneTrackProps {
    items: VetoSequenceItem[];
    team1Name: string;
    team2Name: string;
    team1Logo?: string | null;
    team2Logo?: string | null;
    className?: string;
}

const ARRIVE_EASE = [0.2, 0, 0, 1] as const;
const CARD_HEIGHT = 'h-[92px] sm:h-[112px]';

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function isBan(action: string) {
    return action === 'ban' || action === 'ignore';
}

/** A step as a card: full map art once it's settled, a ghost outline while it's still to come. */
const StepCard: React.FC<{ item: VetoSequenceItem; from: 'above' | 'below'; index: number }> = ({ item, from, index }) => {
    const reduceMotion = useReducedMotion();
    const isCurrent = item.status === 'current';
    const isUpcoming = item.status === 'upcoming';
    const hasArt = Boolean(item.mapName) && !isUpcoming;
    const ban = isBan(item.action);
    const noun = getVetoActionNoun(item.action);

    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: from === 'above' ? -8 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: ARRIVE_EASE, delay: reduceMotion ? 0 : Math.min(index, 8) * 0.03 }}
            className={cn(
                'relative isolate w-full overflow-hidden',
                CARD_HEIGHT,
                isUpcoming && 'border border-dashed border-white/10 bg-transparent',
                !isUpcoming && 'bg-zinc-900',
                isCurrent && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),0_0_0_4px_rgba(255,255,255,0.06)]',
                item.status === 'done' && !ban && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]',
                item.status === 'done' && ban && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
            )}
        >
            {hasArt ? (
                <>
                    <VetoMapArt src={item.mapImageUrl} name={item.mapName ?? ''} muted={ban} />
                    <div className={cn('absolute inset-0', ban ? 'bg-black/70' : 'bg-gradient-to-t from-black/90 via-black/25 to-black/0')} />
                    {ban ? (
                        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
                            <line x1="0" y1="100" x2="100" y2="0" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        </svg>
                    ) : null}
                </>
            ) : null}

            {hasArt ? (
                <div className="relative z-10 flex h-full flex-col justify-between p-2.5">
                    <div className="flex items-start justify-between gap-2">
                        <span className={cn(
                            'px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em]',
                            ban ? 'bg-black/70 text-zinc-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]' : 'bg-white text-matte-black',
                        )}>
                            {noun}
                        </span>
                        {item.side ? (
                            <span className="font-heading text-sm font-black leading-none text-white">{getSideShortLabel(item.side)}</span>
                        ) : null}
                    </div>
                    <p className={cn(
                        'truncate font-heading text-sm font-bold leading-tight tracking-tight sm:text-[15px]',
                        ban ? 'text-zinc-500' : 'text-white',
                    )}>
                        {item.mapName}
                    </p>
                </div>
            ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1">
                    <span className={cn(
                        'font-heading text-xl font-black leading-none tracking-tight sm:text-[26px]',
                        isCurrent ? 'text-white' : 'text-zinc-700',
                    )}>
                        {noun}
                    </span>
                    {item.side ? <span className="font-mono text-[10px] font-bold text-zinc-400">{getSideShortLabel(item.side)}</span> : null}
                </div>
            )}
        </motion.div>
    );
};

/** The rail cell under/over each step: the step number on a line that fills as the veto advances. */
const RailNode: React.FC<{ item: VetoSequenceItem; first: boolean; last: boolean }> = ({ item, first, last }) => {
    const done = item.status === 'done';
    const current = item.status === 'current';
    return (
        <div className="relative flex h-7 items-center justify-center">
            <span className={cn('absolute left-0 right-1/2 top-1/2 h-px', first ? 'bg-transparent' : done || current ? 'bg-white/45' : 'bg-white/10')} />
            <span className={cn('absolute left-1/2 right-0 top-1/2 h-px', last ? 'bg-transparent' : done ? 'bg-white/45' : 'bg-white/10')} />
            <span className={cn(
                'relative z-10 flex h-6 min-w-6 items-center justify-center px-1 font-mono text-[10px] font-bold tabular-nums',
                done && 'bg-zinc-800 text-zinc-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]',
                current && 'bg-white text-matte-black',
                item.status === 'upcoming' && 'bg-background text-zinc-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]',
            )}>
                {pad(item.actionNumber)}
            </span>
        </div>
    );
};

const Stem: React.FC<{ item: VetoSequenceItem }> = ({ item }) => (
    <span className={cn('mx-auto block h-2.5 w-px', item.status === 'upcoming' ? 'bg-white/10' : 'bg-white/40')} aria-hidden />
);

const LaneLabel: React.FC<{ name: string; logo?: string | null }> = ({ name, logo }) => (
    <div className={cn('flex items-center gap-2 pr-3', CARD_HEIGHT)}>
        <VetoCrest name={name} logo={logo} className="h-7 w-7" />
        <span className="hidden min-w-0 truncate text-xs font-semibold text-zinc-300 sm:block">{name}</span>
    </div>
);

/**
 * The veto as a duel: one lane per team, each step dropping onto a shared,
 * numbered rail that fills as the veto advances. Who acted is told by position,
 * not by colour or a label on every card.
 */
export const VetoLaneTrack: React.FC<VetoLaneTrackProps> = ({
    items,
    team1Name,
    team2Name,
    team1Logo,
    team2Logo,
    className,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentStep = items.find((item) => item.status === 'current')?.actionNumber;

    useEffect(() => {
        const track = scrollRef.current;
        const current = track?.querySelector<HTMLElement>('[data-current]');
        if (!track || !current || track.scrollWidth <= track.clientWidth) return;
        const target = current.offsetLeft - track.clientWidth / 2 + current.clientWidth / 2;
        track.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }, [currentStep]);

    return (
        <div className={cn('flex border border-white/[0.07] bg-card', className)} data-testid="veto-sequence">
            <div className="z-10 flex shrink-0 flex-col justify-between border-r border-white/[0.07] bg-card py-3 pl-2 sm:w-40 sm:pl-3">
                <LaneLabel name={team1Name} logo={team1Logo} />
                <div className="h-7" aria-hidden />
                <LaneLabel name={team2Name} logo={team2Logo} />
            </div>
            <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain py-3 [scrollbar-width:thin]" data-lenis-prevent>
                <ol className="flex min-w-full px-3" aria-label="Veto order">
                    {items.map((item, index) => {
                        const lane = item.lane ?? 'team1';
                        const card = <StepCard item={item} from={lane === 'team1' ? 'above' : 'below'} index={index} />;
                        return (
                            <li
                                key={`${item.actionNumber}-${item.action}`}
                                data-current={item.status === 'current' || undefined}
                                aria-current={item.status === 'current' ? 'step' : undefined}
                                aria-label={`Step ${item.actionNumber}: ${item.teamName} ${getVetoActionNoun(item.action).toLowerCase()}${item.mapName ? ` ${item.mapName}` : ''}`}
                                className="flex min-w-[5.75rem] flex-1 flex-col px-1 sm:min-w-[7rem]"
                            >
                                <div className="flex min-h-[102px] flex-col justify-end sm:min-h-[122px]">
                                    {lane === 'team1' ? <>{card}<Stem item={item} /></> : null}
                                </div>
                                <RailNode item={item} first={index === 0} last={index === items.length - 1} />
                                <div className="flex min-h-[102px] flex-col justify-start sm:min-h-[122px]">
                                    {lane === 'team2' ? <><Stem item={item} />{card}</> : null}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
};

export default VetoLaneTrack;
