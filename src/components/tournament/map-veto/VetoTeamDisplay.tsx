import React from 'react';
import { cn } from '@/lib/utils';
import type { MatchMapVeto } from '@/hooks/useMapVetoMachine';
import { getVetoActionClasses, getVetoActionNoun } from './vetoActionPresentation';

interface VetoTeamDisplayProps {
    team1Name: string;
    team1Logo?: string | null;
    team2Name: string;
    team2Logo?: string | null;
    activeSide?: 'team1' | 'team2' | null;
    currentAction?: MatchMapVeto['current_action'];
    completed?: boolean;
    bestOf?: number;
    compact?: boolean;
    className?: string;
}

interface TeamBlockProps {
    name: string;
    logo?: string | null;
    active: boolean;
    compact: boolean;
}

const TeamBlock: React.FC<TeamBlockProps> = ({ name, logo, active, compact }) => {
    const logoSize = compact
        ? 'h-10 w-10 sm:h-12 sm:w-12'
        : 'h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20';
    const fallbackText = compact
        ? 'text-xl sm:text-2xl'
        : 'text-2xl sm:text-3xl md:text-4xl';

    return (
        <div className="flex min-w-[5.5rem] max-w-[9.5rem] flex-col items-center gap-2 sm:min-w-[6.5rem] sm:max-w-[11rem]">
            {logo ? (
                <img
                    src={logo}
                    alt={name}
                    className={cn(
                        logoSize,
                        'object-contain transition-[filter,transform] duration-200',
                        active && 'drop-shadow-[0_0_12px_rgba(244,63,94,0.55)]',
                    )}
                />
            ) : (
                <span className={cn(
                    'font-black leading-none text-white/90',
                    fallbackText,
                    active && 'text-rose-300',
                )}>
                    {name.charAt(0)}
                </span>
            )}
            <span
                className={cn(
                    'max-w-full text-center font-bold transition-colors',
                    compact
                        ? 'truncate text-xs'
                        : 'line-clamp-2 text-xs leading-snug sm:text-sm md:text-base',
                    active ? 'text-rose-200' : 'text-white',
                )}
                title={name}
            >
                {name}
            </span>
        </div>
    );
};

export const VetoTeamDisplay: React.FC<VetoTeamDisplayProps> = ({
    team1Name,
    team1Logo,
    team2Name,
    team2Logo,
    activeSide = null,
    currentAction = null,
    completed = false,
    bestOf,
    compact = false,
    className,
}) => (
    <div className={cn(
        'mx-auto flex w-fit max-w-full items-center justify-center gap-3 sm:gap-5 md:gap-8',
        className,
    )}>
        <TeamBlock
            name={team1Name}
            logo={team1Logo}
            active={activeSide === 'team1'}
            compact={compact}
        />

        <div className="flex shrink-0 flex-col items-center justify-center gap-2 px-0.5">
            <div className={cn('font-light text-white/30', compact ? 'text-sm' : 'text-base sm:text-lg')}>VS</div>
            <div className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
                completed
                    ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                    : currentAction
                        ? getVetoActionClasses(currentAction)
                        : 'border border-white/10 bg-white/5 text-white/60',
            )}>
                {completed ? `BO${bestOf || 1} Complete` : currentAction ? getVetoActionNoun(currentAction) : 'Ready'}
            </div>
        </div>

        <TeamBlock
            name={team2Name}
            logo={team2Logo}
            active={activeSide === 'team2'}
            compact={compact}
        />
    </div>
);
