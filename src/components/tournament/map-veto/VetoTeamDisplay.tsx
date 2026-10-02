import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { VetoCrest } from './VetoCrest';
import type { MatchMapVeto } from '@/hooks/useMapVetoMachine';

interface VetoTeamDisplayProps {
    team1Name: string;
    team1Logo?: string | null;
    team2Name: string;
    team2Logo?: string | null;
    activeSide?: 'team1' | 'team2' | null;
    /** Kept for API compatibility; the turn banner names the action. */
    currentAction?: MatchMapVeto['current_action'];
    completed?: boolean;
    bestOf?: number;
    /** e.g. "Step 3 of 7" — shown on the centre axis while the veto is live. */
    stepLabel?: string | null;
    compact?: boolean;
    className?: string;
}

interface TeamSideProps {
    name: string;
    logo?: string | null;
    active: boolean;
    align: 'left' | 'right';
    compact: boolean;
}

const MARKER_TRANSITION = { duration: 0.22, ease: [0.2, 0, 0, 1] } as const;

const TeamSide: React.FC<TeamSideProps> = ({ name, logo, active, align, compact }) => {
    const reduceMotion = useReducedMotion();
    const isRight = align === 'right';

    return (
        <div className={cn(
            'relative flex min-w-0 flex-col gap-2 self-stretch sm:flex-row sm:items-center sm:gap-3',
            compact ? 'px-3 py-3' : 'px-3 py-3 sm:px-6 sm:py-5',
            isRight ? 'items-end text-right sm:flex-row-reverse' : 'items-start',
        )}>
            <VetoCrest
                name={name}
                logo={logo}
                className={cn('bg-white/[0.04] shadow-none', compact ? 'h-9 w-9 p-1.5' : 'h-10 w-10 p-1.5 sm:h-14 sm:w-14 sm:p-2')}
            />
            <div className="w-full min-w-0">
                <p
                    className={cn(
                        'line-clamp-2 break-words font-heading font-bold leading-tight tracking-tight transition-colors duration-200 sm:line-clamp-1',
                        compact ? 'text-sm sm:text-base' : 'text-sm sm:text-xl',
                        active ? 'text-white' : 'text-zinc-400',
                    )}
                    title={name}
                >
                    {name}
                </p>
            </div>
            {active ? (
                <motion.span
                    layoutId="veto-active-team-cue"
                    transition={reduceMotion ? { duration: 0 } : MARKER_TRANSITION}
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-rose-500"
                    aria-hidden
                />
            ) : null}
        </div>
    );
};

/**
 * The veto scorebug: both teams on one axis, the team on the clock lit by the
 * single rose cue. Teams keep their names; colour never decides who is who.
 */
export const VetoTeamDisplay: React.FC<VetoTeamDisplayProps> = ({
    team1Name,
    team1Logo,
    team2Name,
    team2Logo,
    activeSide = null,
    completed = false,
    bestOf,
    stepLabel,
    compact = false,
    className,
}) => {

    return (
        <div
            className={cn(
                'grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border border-white/[0.07] bg-card',
                className,
            )}
            role="group"
            aria-label={`${team1Name} versus ${team2Name}`}
        >
            <TeamSide
                name={team1Name}
                logo={team1Logo}
                active={activeSide === 'team1'}
                align="left"
                compact={compact}
            />

            <div className={cn(
                'flex flex-col items-center justify-center gap-1.5 self-stretch border-x border-white/[0.07]',
                compact ? 'px-3' : 'px-3 sm:px-8',
            )}>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    BO{bestOf || 1}
                </span>
                <span className={cn(
                    'whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.18em]',
                    stepLabel && !completed ? 'text-zinc-300' : 'text-zinc-600',
                )}>
                    {completed ? 'vs' : stepLabel || 'vs'}
                </span>
            </div>

            <TeamSide
                name={team2Name}
                logo={team2Logo}
                active={activeSide === 'team2'}
                align="right"
                compact={compact}
            />
        </div>
    );
};
