import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import type { MatchMapVeto } from '@/hooks/useMapVetoMachine';
import { getVetoActionNoun, getVetoInstruction, getVetoSpectatorLine } from './vetoActionPresentation';

interface VetoTurnBannerProps {
    veto: MatchMapVeto;
    isUserTurn: boolean;
    currentTeamName: string;
    totalSteps?: number;
    compact?: boolean;
    className?: string;
}

const ARRIVE = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0, 0, 1] } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.11, ease: [0.4, 0, 1, 1] } },
} as const;

function secondsLeft(startedAt: string | null, durationSeconds: number, now: number): number | null {
    if (!startedAt || !durationSeconds || durationSeconds <= 0) return null;
    const started = Date.parse(startedAt);
    if (Number.isNaN(started)) return null;
    return Math.max(0, Math.ceil((started + durationSeconds * 1000 - now) / 1000));
}

function formatClock(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The turn clock is the one value on this view allowed to change continuously. */
const TurnClock: React.FC<{ startedAt: string | null; durationSeconds: number }> = ({ startedAt, durationSeconds }) => {
    const [now, setNow] = useState(() => Date.now());
    const remaining = secondsLeft(startedAt, durationSeconds, now);

    useEffect(() => {
        if (secondsLeft(startedAt, durationSeconds, Date.now()) === null) return undefined;
        const timer = window.setInterval(() => {
            const tick = Date.now();
            setNow(tick);
            if (secondsLeft(startedAt, durationSeconds, tick) === 0) window.clearInterval(timer);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [startedAt, durationSeconds]);

    if (remaining === null) return null;

    return (
        <div className="shrink-0 text-right" aria-live="off">
            <p className={EYEBROW_CLASS}>Time left</p>
            <p className={cn(
                'mt-1 font-heading text-3xl font-black leading-none tabular-nums sm:text-4xl',
                remaining <= 10 ? 'text-amber-300' : 'text-white',
            )}>
                {formatClock(remaining)}
            </p>
        </div>
    );
};

/**
 * The hero of a live veto: whose move it is and what they must do.
 * Captains read an instruction; everyone else reads what is happening.
 */
export const VetoTurnBanner: React.FC<VetoTurnBannerProps> = ({
    veto,
    isUserTurn,
    currentTeamName,
    totalSteps,
    compact = false,
    className,
}) => {
    const reduceMotion = useReducedMotion();
    const step = veto.current_action_number || 1;
    const action = veto.current_action;
    const stepCaption = totalSteps ? `Step ${step} of ${totalSteps}` : `Step ${step}`;
    const headline = isUserTurn ? `Your turn. ${getVetoInstruction(action)}.` : `${getVetoSpectatorLine(currentTeamName, action)}.`;

    return (
        <div className={cn('flex items-end justify-between gap-4 border-b border-white/[0.07]', compact ? 'pb-3' : 'pb-4', className)}>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={`${step}-${veto.current_team_id}-${action}`}
                    {...(reduceMotion ? {} : ARRIVE)}
                    className="min-w-0"
                    aria-live="polite"
                >
                    <p className={EYEBROW_CLASS}>
                        {stepCaption}
                        {action ? <span className="text-zinc-400"> · {getVetoActionNoun(action)}</span> : null}
                    </p>
                    <p className={cn(
                        'mt-1.5 font-heading font-black leading-[1.05] tracking-tight',
                        compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[32px]',
                        isUserTurn ? 'text-white' : 'text-zinc-300',
                    )}>
                        {headline}
                    </p>
                </motion.div>
            </AnimatePresence>
            <TurnClock startedAt={veto.turn_started_at} durationSeconds={veto.turn_duration_seconds} />
        </div>
    );
};

export default VetoTurnBanner;
