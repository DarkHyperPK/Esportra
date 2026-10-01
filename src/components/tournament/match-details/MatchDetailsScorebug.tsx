import React from 'react';
import { cn } from '@/lib/utils';
import { StatusPill, type Tone } from '@/components/ui/kit';
import { VetoCrest } from '@/components/tournament/map-veto/VetoCrest';
import type { BracketTeam } from '@/types/bracketTypes';
import type { SeriesSide } from '@/services/matchStats/publicGameStats';

export interface MatchStatusDisplay {
    label: string;
    tone: Tone;
}

interface MatchDetailsScorebugProps {
    team1: BracketTeam | null;
    team2: BracketTeam | null;
    team1Score: number | null;
    team2Score: number | null;
    winner: SeriesSide | null;
    status: MatchStatusDisplay;
    caption: string;
    timeLabel?: string | null;
}

interface SideProps {
    team: BracketTeam | null;
    won: boolean;
    lost: boolean;
    align: 'left' | 'right';
}

const Side: React.FC<SideProps> = ({ team, won, lost, align }) => (
    <div className={cn(
        'relative flex min-w-0 flex-col gap-2 self-stretch py-4 sm:flex-row sm:items-center sm:gap-4',
        align === 'right' ? 'items-end text-right sm:flex-row-reverse' : 'items-start',
    )}>
        <VetoCrest
            name={team?.name ?? 'To be decided'}
            logo={team?.logo_url}
            className="h-10 w-10 bg-white/[0.04] p-1.5 shadow-none sm:h-16 sm:w-16 sm:p-2"
        />
        <div className="w-full min-w-0">
            <p className={cn(
                'line-clamp-2 break-words font-heading text-sm font-bold leading-tight tracking-tight sm:line-clamp-1 sm:text-2xl',
                lost ? 'text-zinc-500' : team ? 'text-white' : 'text-zinc-600',
            )}>
                {team?.name ?? 'To be decided'}
            </p>
            <p className={cn(
                'mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em]',
                won ? 'text-zinc-200' : 'text-zinc-600',
            )}>
                {won ? 'Winner' : team?.seed ? `Seed ${team.seed}` : ' '}
            </p>
        </div>
        {won ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-rose-500" /> : null}
    </div>
);

/**
 * The fixture as a broadcast scorebug: caption, the versus lockup on one axis,
 * the series score as the hero. The winner is white and underlined by the one
 * rose cue; the other side is grey, never red.
 */
export const MatchDetailsScorebug: React.FC<MatchDetailsScorebugProps> = ({
    team1,
    team2,
    team1Score,
    team2Score,
    winner,
    status,
    caption,
    timeLabel,
}) => {
    const hasScore = team1Score !== null || team2Score !== null;

    return (
        <header className="border-b border-white/[0.07] bg-card px-5 pt-5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pr-8">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{caption}</p>
                <StatusPill label={status.label} tone={status.tone} />
            </div>


            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                <Side team={team1} won={winner === 'team1'} lost={winner === 'team2'} align="left" />
                <span className="sr-only">
                    {hasScore ? `Series score ${team1Score ?? 0} to ${team2Score ?? 0}` : 'Not played yet'}
                </span>
                <div className="flex items-center gap-2 font-heading font-black leading-none tabular-nums sm:gap-4" aria-hidden>
                    {hasScore ? (
                        <>
                            <span className={cn('text-4xl sm:text-6xl', winner === 'team2' ? 'text-zinc-600' : 'text-white')}>{team1Score ?? 0}</span>
                            <span className="text-xl text-zinc-700 sm:text-3xl">:</span>
                            <span className={cn('text-4xl sm:text-6xl', winner === 'team1' ? 'text-zinc-600' : 'text-white')}>{team2Score ?? 0}</span>
                        </>
                    ) : (
                        <span className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">vs</span>
                    )}
                </div>
                <Side team={team2} won={winner === 'team2'} lost={winner === 'team1'} align="right" />
            </div>

            {timeLabel ? (
                <p className="border-t border-white/[0.06] py-2.5 text-xs text-zinc-400">{timeLabel}</p>
            ) : null}
        </header>
    );
};

export default MatchDetailsScorebug;
