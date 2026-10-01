import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { VetoSequenceItem } from './buildVetoSequenceItems';
import { buildVetoStripCards, type VetoStripCard } from './buildVetoStripCards';
import { VetoMapArt } from './VetoMapArt';
import { VetoCrest } from './VetoCrest';
import { getSideShortLabel } from './vetoActionPresentation';

interface VetoBroadcastStripProps {
    items: VetoSequenceItem[];
    team1Name: string;
    team2Name: string;
    team1Logo?: string | null;
    team2Logo?: string | null;
    className?: string;
}

const ARRIVE_EASE = [0.2, 0, 0, 1] as const;

const KIND_WORD: Record<VetoStripCard['kind'], string> = {
    ban: 'Ban',
    pick: 'Pick',
    decider: 'Decider',
};

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function cardLabel(card: VetoStripCard) {
    const who = card.teamName ? `${card.teamName} ` : '';
    const what = card.kind === 'decider' ? 'decider' : card.kind === 'ban' ? 'bans' : 'picks';
    const side = card.side && card.sideTeamName ? `, ${card.sideTeamName} ${getSideShortLabel(card.side)}` : '';
    return `Step ${card.stepNumber}: ${who}${what}${card.mapName ? ` ${card.mapName}` : ''}${side}`;
}

interface StripCardProps {
    card: VetoStripCard;
    index: number;
    logoFor: (name?: string) => string | null | undefined;
}

const SideTag: React.FC<Omit<StripCardProps, 'index'>> = ({ card, logoFor }) => {
    if (!card.sideTeamName) return null;
    return (
        <span className="flex items-center justify-center gap-1.5">
            <VetoCrest name={card.sideTeamName} logo={logoFor(card.sideTeamName)} className="h-5 w-5 p-0.5" />
            <span className={cn(
                'font-mono text-[11px] font-bold tracking-[0.18em]',
                card.side ? 'text-white' : 'text-zinc-500',
            )}>
                {card.side ? getSideShortLabel(card.side) : '— —'}
            </span>
        </span>
    );
};

/** One map decision as a broadcast card: crest on top, the map, the verdict in the footer band. */
const StripCard: React.FC<StripCardProps> = ({ card, index, logoFor }) => {
    const reduceMotion = useReducedMotion();
    const isBan = card.kind === 'ban';
    const isUpcoming = card.status === 'upcoming';
    const isCurrent = card.status === 'current';
    const showArt = Boolean(card.mapName) && !isUpcoming;

    return (
        <motion.li
            data-current={isCurrent || undefined}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={cardLabel(card)}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: isCurrent ? -4 : 0 }}
            transition={{ duration: 0.22, ease: ARRIVE_EASE, delay: reduceMotion ? 0 : Math.min(index, 8) * 0.035 }}
            className={cn(
                'relative isolate flex h-[236px] min-w-[7.5rem] flex-1 flex-col overflow-hidden sm:h-[272px] sm:min-w-[8.75rem]',
                isUpcoming ? 'border border-dashed border-white/10' : 'bg-zinc-900',
                !isUpcoming && !isBan && 'shadow-[0_14px_30px_-12px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.18)]',
                !isUpcoming && isBan && 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]',
                isCurrent && 'shadow-[0_18px_36px_-12px_rgba(0,0,0,0.95),inset_0_0_0_2px_rgba(255,255,255,0.9)]',
            )}
        >
            {showArt ? (
                <>
                    <VetoMapArt src={card.mapImageUrl} name={card.mapName ?? ''} muted={isBan} />
                    <div className={cn(
                        'absolute inset-0',
                        isBan ? 'bg-black/70' : 'bg-gradient-to-b from-black/60 via-black/5 to-black/85',
                    )} />
                </>
            ) : (
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:16px_16px]" />
            )}

            <span className="absolute left-2.5 top-2.5 z-10 font-mono text-[10px] font-bold tabular-nums text-zinc-500">{pad(card.stepNumber)}</span>

            <div className="relative z-10 flex flex-1 flex-col items-center px-2 pt-4 text-center">
                {card.teamName ? (
                    <>
                        <VetoCrest
                            name={card.teamName}
                            logo={logoFor(card.teamName)}
                            className={cn('h-10 w-10 sm:h-11 sm:w-11', (isUpcoming || isBan) && 'opacity-70')}
                        />
                        <span className={cn(
                            'mt-1.5 w-full truncate text-[11px] font-semibold',
                            isUpcoming ? 'text-zinc-600' : 'text-zinc-300',
                        )}>
                            {card.teamName}
                        </span>
                    </>
                ) : (
                    <span className="h-10 sm:h-11" aria-hidden />
                )}

                <div className="mt-auto w-full space-y-2 pb-3">
                    <p className={cn(
                        'truncate font-heading text-lg font-black leading-none tracking-tight sm:text-xl',
                        isUpcoming ? 'text-zinc-700' : isBan ? 'text-zinc-400' : 'text-white',
                    )}>
                        {card.mapName ?? '\u00a0'}
                    </p>
                    <SideTag card={card} logoFor={logoFor} />
                </div>
            </div>

            <div className={cn(
                'relative z-10 flex h-9 shrink-0 items-center justify-center font-mono text-xs font-bold uppercase tracking-[0.32em]',
                isUpcoming && 'border-t border-dashed border-white/10 text-zinc-700',
                !isUpcoming && isBan && 'border-t border-white/10 bg-black/80 text-zinc-400',
                !isUpcoming && card.kind === 'pick' && 'bg-white text-matte-black',
                !isUpcoming && card.kind === 'decider' && 'border-t border-white/50 bg-black/70 text-white',
            )}>
                {KIND_WORD[card.kind]}
            </div>
        </motion.li>
    );
};

/**
 * The veto as a broadcast strip: one tall card per map decision, in order.
 * Bans fall back into grey, picks and the decider stand forward in colour,
 * the card on the clock lifts and lights up.
 */
export const VetoBroadcastStrip: React.FC<VetoBroadcastStripProps> = ({
    items,
    team1Name,
    team2Name,
    team1Logo,
    team2Logo,
    className,
}) => {
    const scrollRef = useRef<HTMLOListElement>(null);
    const cards = buildVetoStripCards(items);
    const currentKey = cards.find((card) => card.status === 'current')?.key;
    const logoFor = (name?: string) => (name === team1Name ? team1Logo : name === team2Name ? team2Logo : null);

    useEffect(() => {
        const track = scrollRef.current;
        const current = track?.querySelector<HTMLElement>('[data-current]');
        if (!track || !current || track.scrollWidth <= track.clientWidth) return;
        const target = current.offsetLeft - track.clientWidth / 2 + current.clientWidth / 2;
        track.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }, [currentKey]);

    return (
        <ol
            ref={scrollRef}
            className={cn('flex gap-2 overflow-x-auto overscroll-x-contain pb-1 pt-2 [scrollbar-width:thin] sm:gap-2.5', className)}
            aria-label="Veto order"
            data-testid="veto-sequence"
            data-lenis-prevent
        >
            {cards.map((card, index) => (
                <StripCard key={card.key} card={card} index={index} logoFor={logoFor} />
            ))}
        </ol>
    );
};

export default VetoBroadcastStrip;
