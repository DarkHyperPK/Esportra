import { useState } from 'react';
import { cn } from '@/lib/utils';
import { StatusPill, type Tone } from '@/components/ui/kit';
import { TeamCrest } from '@/components/bracket/TeamCrest';
import { championGlow } from '@/components/bracket/teamTint';
import type { BracketTeam } from '@/types/bracketTypes';
import type { SeriesSide } from '@/services/matchStats/publicGameStats';
import type { ResultSource } from '@/services/matchStats/matchEvidence';
import { ResultSourceBadge } from './ResultSourceBadge';

export interface MatchStatusDisplay {
    label: string;
    tone: Tone;
}

type Props = {
    team1: BracketTeam | null;
    team2: BracketTeam | null;
    team1Score: number | null;
    team2Score: number | null;
    winner: SeriesSide | null;
    status: MatchStatusDisplay;
    caption: string;
    timeLabel?: string | null;
    /** Art of the map that decided it (or the first map), behind everything. */
    backdropUrl?: string | null;
    source?: { lead: ResultSource; text: string } | null;
};

const Side = ({ team, won, lost, align }: { team: BracketTeam | null; won: boolean; lost: boolean; align: 'left' | 'right' }) => (
    <div className={cn('flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5', align === 'right' && 'items-end text-right sm:flex-row-reverse')}>
        <TeamCrest
            name={team?.name ?? 'TBD'}
            logoUrl={team?.logo_url}
            tintKey={team?.id}
            className={cn('h-14 w-14 text-[15px] sm:h-[84px] sm:w-[84px] sm:text-[22px]', lost && 'opacity-60 grayscale-[0.4]')}
        />
        <div className="min-w-0">
            <p className={cn(
                'line-clamp-2 break-words font-heading text-[17px] font-black leading-[1.05] tracking-tight sm:line-clamp-1 sm:text-[30px]',
                lost ? 'text-zinc-500' : team ? 'text-white' : 'text-zinc-600',
            )}>
                {team?.name ?? 'To be decided'}
            </p>
            <div className={cn('mt-2 flex items-center gap-2', align === 'right' && 'justify-end')}>
                {won ? <span aria-hidden className="h-0.5 w-6 bg-rose-500" /> : null}
                <span className={cn('font-mono text-[10px] font-semibold uppercase tracking-[0.24em]', won ? 'text-white' : 'text-zinc-500')}>
                    {won ? 'Winner' : team?.seed ? `Seed ${team.seed}` : ' '}
                </span>
            </div>
        </div>
    </div>
);

/**
 * The match as the moment it was: map art behind, each team's colour glowing
 * behind its crest (brighter for the winner), the series score as the hero,
 * and a line saying how the result was reported.
 */
export const MatchHero = ({ team1, team2, team1Score, team2Score, winner, status, caption, timeLabel, backdropUrl, source }: Props) => {
    const hasScore = team1Score !== null || team2Score !== null;
    const [failedArt, setFailedArt] = useState<string | null>(null);
    const glow = (team: BracketTeam | null, strong: boolean) => (team ? championGlow(team.id || team.name, strong ? 0.42 : 0.2) : 'transparent');

    return (
        <header className="relative isolate overflow-hidden border-b border-white/[0.08] bg-[#0d0d11]">
            {backdropUrl && failedArt !== backdropUrl ? (
                <img src={backdropUrl} alt="" aria-hidden onError={() => setFailedArt(backdropUrl)} className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />
            ) : null}
            <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: [
                        `radial-gradient(ellipse 45% 90% at 0% 60%, ${glow(team1, winner === 'team1')}, transparent 70%)`,
                        `radial-gradient(ellipse 45% 90% at 100% 60%, ${glow(team2, winner === 'team2')}, transparent 70%)`,
                        'linear-gradient(180deg, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0.85) 70%, #09090b 100%)',
                    ].join(', '),
                }}
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-5 pr-14 sm:px-8">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-300">{caption}</p>
                <StatusPill label={status.label} tone={status.tone} />
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-5 py-7 sm:gap-8 sm:px-8 sm:py-10">
                <Side team={team1} won={winner === 'team1'} lost={winner === 'team2'} align="left" />
                <div className="flex flex-col items-center">
                    <span className="sr-only">{hasScore ? `Series score ${team1Score ?? 0} to ${team2Score ?? 0}` : 'Not played yet'}</span>
                    {hasScore ? (
                        <div aria-hidden className="flex items-center gap-3 font-heading font-black leading-none tabular-nums sm:gap-5">
                            <span className={cn('text-[44px] sm:text-[88px]', winner === 'team2' ? 'text-white/30' : 'text-white')}>{team1Score ?? 0}</span>
                            <span className="h-8 w-px bg-white/20 sm:h-14" />
                            <span className={cn('text-[44px] sm:text-[88px]', winner === 'team1' ? 'text-white/30' : 'text-white')}>{team2Score ?? 0}</span>
                        </div>
                    ) : (
                        <span aria-hidden className="font-heading text-[28px] font-black text-white/25 sm:text-[44px]">VS</span>
                    )}
                </div>
                <Side team={team2} won={winner === 'team2'} lost={winner === 'team1'} align="right" />
            </div>

            {timeLabel || source ? (
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/[0.07] bg-black/30 px-5 py-3 sm:px-8">
                    <p className="text-[12px] text-zinc-300">{timeLabel ?? ''}</p>
                    {source ? (
                        <p className="flex items-center gap-2 text-[12px] text-zinc-300">
                            <ResultSourceBadge source={source.lead} iconOnly />
                            {source.text}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </header>
    );
};

export default MatchHero;
