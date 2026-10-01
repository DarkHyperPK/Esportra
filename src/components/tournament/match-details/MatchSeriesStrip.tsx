import React from 'react';
import { cn } from '@/lib/utils';
import type { PublicGame } from '@/services/matchStats/publicGameStats';

interface MatchSeriesStripProps {
    games: PublicGame[];
    selectedKey: string | null;
    onSelect: (key: string) => void;
    team1Name: string;
    team2Name: string;
    panelId: string;
}

function scoreText(game: PublicGame) {
    if (game.team1Score === null || game.team2Score === null) return 'No score';
    return `${game.team1Score} : ${game.team2Score}`;
}

/** The series map by map. Each map is a tab; the selected one opens its scoreboard below. */
export const MatchSeriesStrip: React.FC<MatchSeriesStripProps> = ({
    games,
    selectedKey,
    onSelect,
    team1Name,
    team2Name,
    panelId,
}) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const index = games.findIndex((game) => game.key === selectedKey);
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const next = games[(index + step + games.length) % games.length];
        if (!next) return;
        event.preventDefault();
        onSelect(next.key);
        event.currentTarget.querySelector<HTMLButtonElement>(`[data-key="${next.key}"]`)?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label="Maps in this series"
            onKeyDown={handleKeyDown}
            className="grid auto-cols-[minmax(7rem,1fr)] grid-flow-col gap-px overflow-x-auto bg-white/[0.06]"
            data-lenis-prevent
        >
            {games.map((game) => {
                const selected = game.key === selectedKey;
                const winnerName = game.winner === 'team1' ? team1Name : game.winner === 'team2' ? team2Name : null;
                return (
                    <button
                        key={game.key}
                        type="button"
                        role="tab"
                        id={`${panelId}-tab-${game.key}`}
                        data-key={game.key}
                        aria-selected={selected}
                        aria-controls={panelId}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onSelect(game.key)}
                        className={cn(
                            'flex min-w-0 flex-col items-start gap-1 px-3 py-3 text-left sm:px-4 transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40',
                            selected
                                ? 'bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]'
                                : 'bg-card hover:bg-white/[0.03]',
                        )}
                    >
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Map {game.gameNumber}</span>
                        <span className={cn('w-full truncate font-heading text-base font-bold tracking-tight', selected ? 'text-white' : 'text-zinc-300')}>
                            {game.mapName}
                        </span>
                        <span className="flex w-full items-baseline justify-between gap-2">
                            <span className="font-heading text-sm font-black tabular-nums text-white">{scoreText(game)}</span>
                            <span className="hidden truncate text-[11px] text-zinc-500 sm:inline">{winnerName ?? ''}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default MatchSeriesStrip;
