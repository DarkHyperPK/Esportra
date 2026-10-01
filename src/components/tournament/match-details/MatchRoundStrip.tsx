import React from 'react';
import { cn } from '@/lib/utils';
import type { PublicRound } from '@/services/matchStats/publicGameStats';

interface MatchRoundStripProps {
    rounds: PublicRound[];
    team1Name: string;
    team2Name: string;
}

const HALF = 12;

/**
 * Round by round, one row per team: a filled cell marks the round that team won.
 * Position carries the meaning, so it reads without relying on colour.
 */
export const MatchRoundStrip: React.FC<MatchRoundStripProps> = ({ rounds, team1Name, team2Name }) => {
    if (rounds.length === 0 || rounds.every((round) => round.winner === null)) return null;

    const rows: Array<{ side: 'team1' | 'team2'; name: string }> = [
        { side: 'team1', name: team1Name },
        { side: 'team2', name: team2Name },
    ];

    return (
        <section aria-label="Rounds" className="min-w-0">
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Rounds · {rounds.length}
            </p>
            <div className="overflow-x-auto border border-white/[0.07] bg-card p-3" data-lenis-prevent>
                <div className="grid w-max grid-cols-[minmax(4.5rem,8rem)_auto] items-center gap-x-3 gap-y-1.5">
                    {rows.map((row) => (
                        <React.Fragment key={row.side}>
                            <span className="truncate text-xs text-zinc-400">{row.name}</span>
                            <ol className="flex gap-[3px]" aria-label={`Rounds won by ${row.name}`}>
                                {rounds.map((round, index) => {
                                    const won = round.winner === row.side;
                                    return (
                                        <li
                                            key={`${row.side}-${round.round}-${index}`}
                                            className={cn(
                                                'h-4 w-2.5 shrink-0 sm:w-3.5',
                                                won ? 'bg-white' : 'bg-white/[0.06]',
                                                index === HALF && 'ml-2',
                                            )}
                                            title={`Round ${index + 1}${won ? ` · ${row.name}` : ''}`}
                                        >
                                            <span className="sr-only">{won ? `Round ${index + 1} won` : ''}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MatchRoundStrip;
