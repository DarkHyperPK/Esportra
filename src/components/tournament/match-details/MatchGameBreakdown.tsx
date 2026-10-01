import React from 'react';
import { cn } from '@/lib/utils';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import { MAP_THEMES, getMapSplash } from '@/components/tournament/fullScoreboardConstants';
import { VetoMapArt } from '@/components/tournament/map-veto/VetoMapArt';
import type { PublicGame } from '@/services/matchStats/publicGameStats';
import { MatchRoundStrip } from './MatchRoundStrip';

interface MatchGameBreakdownProps {
    game: PublicGame;
    team1Name: string;
    team2Name: string;
    team1Id?: string;
    panelId: string;
}

function splashFor(mapName: string) {
    const theme = MAP_THEMES[mapName.toLowerCase()];
    return theme ? getMapSplash(theme.id) : null;
}

/** One map: the result on its art, the rounds, then both teams' scoreboards. */
export const MatchGameBreakdown: React.FC<MatchGameBreakdownProps> = ({ game, team1Name, team2Name, team1Id, panelId }) => {
    const hasScore = game.team1Score !== null && game.team2Score !== null;

    return (
        <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={`${panelId}-tab-${game.key}`}
            className="space-y-5 border border-t-0 border-white/[0.07] bg-background p-4 sm:p-5"
        >
            <div className="relative isolate flex min-h-[7.5rem] items-end overflow-hidden bg-zinc-900">
                <VetoMapArt src={splashFor(game.mapName)} name={game.mapName} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/20" />
                <div className="relative z-10 flex w-full items-end justify-between gap-4 p-4 sm:p-5">
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Map {game.gameNumber}</p>
                        <p className="mt-1 truncate font-heading text-3xl font-black leading-none tracking-tight text-white sm:text-4xl">{game.mapName}</p>
                    </div>
                    {hasScore ? (
                        <p className="shrink-0 font-heading text-3xl font-black leading-none tabular-nums sm:text-4xl" aria-label={`${team1Name} ${game.team1Score}, ${team2Name} ${game.team2Score}`}>
                            <span className={game.winner === 'team2' ? 'text-zinc-500' : 'text-white'}>{game.team1Score}</span>
                            <span className="px-2 text-xl text-zinc-600">:</span>
                            <span className={game.winner === 'team1' ? 'text-zinc-500' : 'text-white'}>{game.team2Score}</span>
                        </p>
                    ) : null}
                </div>
            </div>

            <MatchRoundStrip rounds={game.rounds} team1Name={team1Name} team2Name={team2Name} />

            {game.players.length > 0 ? (
                <FullScoreboard
                    players={game.players}
                    team1Name={team1Name}
                    team2Name={team2Name}
                    team1Score={game.team1Score ?? 0}
                    team2Score={game.team2Score ?? 0}
                    team1Id={team1Id}
                    t1Side={game.t1Side}
                />
            ) : (
                <p className={cn('border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500')}>
                    {hasScore ? 'Score recorded. No player stats were reported for this map.' : 'No result reported for this map yet.'}
                </p>
            )}
        </div>
    );
};

export default MatchGameBreakdown;
