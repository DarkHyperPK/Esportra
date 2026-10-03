import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2 } from 'lucide-react';
import { useShareCardExport } from '@/hooks/useShareCardExport';
import { useValorantAgents, type ValorantAgent } from '@/hooks/useValorantCatalog';
import { cn } from '@/lib/utils';
import { valorantMapSplash } from '@/services/maps/valorantMapAssets';
import { buildShareCardModel, findSharePlayer, shareFileName, type ShareCardInput } from '@/services/matchStats/shareCardModel';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import { MatchShareCard } from './MatchShareCard';
import { PlayerShareCard } from './PlayerShareCard';
import { MATCH_CARD_SIZE, PLAYER_CARD_SIZE } from './shareCardTheme';

type Props = ShareCardInput & {
    enriched: EnrichedRiotMatchData;
    /** Players this viewer may download cards for; organizers get everyone. */
    playerPuuids: string[];
    caption?: string;
};

const PREVIEW_SCALE = 0.2;
const EMPTY: Record<string, ValorantAgent> = {};

/** Match-room panel: a preview of the match card and one 4:5 card per player. */
export function ShareCardsPanel({ enriched, playerPuuids, caption, team1Name, team2Name, team1Logo, team2Logo, t1Side, mapName }: Props) {
    const agents = useValorantAgents().data ?? EMPTY;
    const model = useMemo(
        () => buildShareCardModel(enriched, { team1Name, team2Name, team1Logo, team2Logo, t1Side, mapName }),
        [enriched, team1Name, team2Name, team1Logo, team2Logo, t1Side, mapName],
    );
    const splash = valorantMapSplash(mapName);
    const { job, start, nodeRef } = useShareCardExport();
    const players = model.teams.flatMap((team) => team.players).filter((player) => playerPuuids.includes(player.puuid));
    const [team1, team2] = model.teams;

    const offscreen = job ? (() => {
        if (job.key === 'match') {
            return <MatchShareCard ref={nodeRef} model={model} agents={agents} mapSplash={splash} caption={caption} />;
        }
        const found = findSharePlayer(model, job.key.replace('player:', ''));
        if (!found) return null;
        const opponent = found.team === team1 ? team2 : team1;
        return (
            <PlayerShareCard ref={nodeRef} player={found.player} team={found.team} opponent={opponent} isMvp={found.isMvp}
                agent={agents[found.player.agentId]} mapName={model.mapName} mapSplash={splash} />
        );
    })() : null;

    const downloadMatch = () => start({ key: 'match', size: MATCH_CARD_SIZE, fileName: shareFileName(team1.name, 'vs', team2.name, model.mapName) });
    const downloadPlayer = (puuid: string, name: string) => start({ key: `player:${puuid}`, size: PLAYER_CARD_SIZE, fileName: shareFileName(name, model.mapName) });

    return (
        <section aria-label="Share cards" className="border border-white/[0.08] bg-[#0c0c0f]">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.07] px-5 py-4">
                <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Share cards</p>
                    <p className="mt-1 text-[13px] text-zinc-300">PNG images for X, Instagram and Discord, made from this map's Riot record.</p>
                </div>
            </header>

            <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[auto_minmax(0,1fr)]">
                <div className="bg-[#0c0c0f] p-5">
                    <div
                        aria-hidden
                        className="pointer-events-none relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        style={{ width: MATCH_CARD_SIZE.width * PREVIEW_SCALE, height: MATCH_CARD_SIZE.height * PREVIEW_SCALE }}
                    >
                        <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
                            <MatchShareCard model={model} agents={agents} mapSplash={splash} caption={caption} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Match · 16:9</span>
                        <DownloadButton busy={job?.key === 'match'} disabled={Boolean(job)} onClick={downloadMatch} label="Download match card" />
                    </div>
                </div>

                <ul className="grid content-start gap-px bg-white/[0.06]" aria-label="Player cards, 4:5">
                    {players.map((player) => {
                        const agent = agents[player.agentId];
                        const isMvp = model.mvpPuuid === player.puuid;
                        return (
                            <li key={player.puuid} className="flex items-center gap-3 bg-[#0c0c0f] px-5 py-2.5">
                                <span className="h-9 w-9 shrink-0 overflow-hidden bg-zinc-900">
                                    {agent?.displayIcon ? <img src={agent.displayIcon} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[14px] font-semibold text-white">{player.name}</span>
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                                        {player.kills}/{player.deaths}/{player.assists} · {player.acs} ACS
                                        {isMvp ? <span className="ml-2 text-rose-400">MVP</span> : null}
                                    </span>
                                </span>
                                <DownloadButton
                                    busy={job?.key === `player:${player.puuid}`}
                                    disabled={Boolean(job)}
                                    onClick={() => downloadPlayer(player.puuid, player.name)}
                                    label={`Download ${player.name}'s card`}
                                />
                            </li>
                        );
                    })}
                </ul>
            </div>

            {offscreen ? createPortal(<div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>{offscreen}</div>, document.body) : null}
        </section>
    );
}

function DownloadButton({ busy, disabled, onClick, label }: { busy: boolean; disabled: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={cn(
                'inline-flex h-9 shrink-0 items-center gap-2 border border-white/15 bg-white/[0.03] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-200 transition-colors',
                'hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-40',
            )}
        >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
            {busy ? 'Saving' : 'PNG'}
        </button>
    );
}

export default ShareCardsPanel;
