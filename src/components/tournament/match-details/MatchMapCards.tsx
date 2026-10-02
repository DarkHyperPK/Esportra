import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { VetoMapArt } from '@/components/tournament/map-veto/VetoMapArt';
import { TeamCrest } from '@/components/bracket/TeamCrest';
import { valorantMapSplash } from '@/services/maps/valorantMapAssets';
import type { BracketTeam } from '@/types/bracketTypes';
import type { PublicGame } from '@/services/matchStats/publicGameStats';
import type { ResultSource } from '@/services/matchStats/matchEvidence';
import { ResultSourceBadge } from './ResultSourceBadge';

type Props = {
    games: PublicGame[];
    sources: Record<string, ResultSource>;
    selectedKey: string | null;
    onSelect: (key: string) => void;
    team1: BracketTeam | null;
    team2: BracketTeam | null;
    panelId: string;
};

/**
 * The series as a row of map cards on their own art. Each is a tab: score,
 * the team that took it, and how the result was reported. The selected map
 * opens its breakdown below.
 */
export const MatchMapCards = ({ games, sources, selectedKey, onSelect, team1, team2, panelId }: Props) => {
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const index = games.findIndex((game) => game.key === selectedKey);
        const next = games[(index + (event.key === 'ArrowRight' ? 1 : -1) + games.length) % games.length];
        if (!next) return;
        event.preventDefault();
        onSelect(next.key);
        event.currentTarget.querySelector<HTMLButtonElement>(`[data-key="${next.key}"]`)?.focus();
    };

    return (
        <div role="tablist" aria-label="Maps in this series" onKeyDown={onKeyDown} className="grid auto-cols-[minmax(11rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1" data-lenis-prevent>
            {games.map((game) => {
                const selected = game.key === selectedKey;
                const taker = game.winner === 'team1' ? team1 : game.winner === 'team2' ? team2 : null;
                const scored = game.team1Score !== null && game.team2Score !== null;
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
                            'group relative isolate flex h-[132px] flex-col justify-between overflow-hidden p-3.5 text-left transition-[transform,box-shadow,filter] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                            selected
                                ? 'shadow-[inset_0_0_0_2px_rgba(255,255,255,0.9),0_18px_36px_-18px_rgba(0,0,0,0.9)]'
                                : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] brightness-75 hover:brightness-100',
                        )}
                    >
                        <VetoMapArt src={valorantMapSplash(game.mapName)} name={game.mapName} className="-z-10 transition-transform duration-500 group-hover:scale-105" />
                        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/20" />
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-200">Map {game.gameNumber}</span>
                            <ResultSourceBadge source={sources[game.key] ?? 'reported'} iconOnly />
                        </div>
                        <div>
                            <p className="truncate font-heading text-[22px] font-black leading-none tracking-tight text-white">{game.mapName}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="shrink-0 whitespace-nowrap font-heading text-[18px] font-black leading-none tabular-nums">
                                    {scored ? (
                                        <>
                                            <span className={game.winner === 'team2' ? 'text-white/40' : 'text-white'}>{game.team1Score}</span>
                                            <span className="px-1 text-white/30">–</span>
                                            <span className={game.winner === 'team1' ? 'text-white/40' : 'text-white'}>{game.team2Score}</span>
                                        </>
                                    ) : (
                                        <span className="text-[12px] font-semibold text-zinc-400">No score</span>
                                    )}
                                </span>
                                {taker ? (
                                    <span className="flex min-w-0 items-center gap-1.5">
                                        <TeamCrest name={taker.name} logoUrl={taker.logo_url} tintKey={taker.id} className="h-5 w-5 text-[8px]" />
                                        <span className="truncate text-[11px] font-semibold text-zinc-200">{taker.name}</span>
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default MatchMapCards;
