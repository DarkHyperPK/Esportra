import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
    Trophy, Skull, ChevronDown, ChevronUp, Zap, List, BarChart3, Crosshair, LayoutGrid,
} from 'lucide-react';
import {
    RiotEconomyChart,
    RiotRoundTimeline,
    RiotWeaponSummaries,
} from '@/components/tournament/RiotMatchAnalytics';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import { resolveEnrichedPlayer } from '@/types/enrichedRiotMatch';
import { formatAbilityCasts, formatStat } from '@/types/scoreboardPlayer';
import { getMapSplash } from '@/components/tournament/fullScoreboardConstants';

interface MatchHistoryCardProps {
    matchData: EnrichedRiotMatchData;
    targetPuuid: string;
}

function formatDuration(ms?: number): string {
    if (!ms) return '-';
    const mins = Math.round(ms / 60000);
    return `${mins}m`;
}

const StatTile: React.FC<{ label: string; value: string | number; accent?: string }> = ({
    label, value, accent = 'text-white',
}) => (
    <div className="rounded border border-white/10 bg-black/30 px-3 py-2 text-center">
        <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
        <p className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
);

const MatchHistoryCard: React.FC<MatchHistoryCardProps> = ({ matchData, targetPuuid }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'scoreboard' | 'economy' | 'rounds' | 'weapons'>('overview');

    const player = matchData.players.find((entry) => entry.puuid === targetPuuid);
    const enrichedTarget = resolveEnrichedPlayer(matchData, targetPuuid);
    const parsedInfo = matchData.matchInfoParsed;
    const teamId = player?.teamId;
    const isWin = matchData.teams.find((team) => team.teamId === teamId)?.won;
    const roundResults = matchData.roundResults ?? [];

    const mapName = parsedInfo?.displayMapName ?? matchData.matchInfo.mapId ?? 'Unknown Map';
    const gameMode = parsedInfo?.displayGameMode ?? matchData.matchInfo.queueId ?? 'Custom';
    const region = parsedInfo?.region ?? matchData.matchInfo.region;
    const mapSplash = parsedInfo?.mapId ? getMapSplash(parsedInfo.mapId) : null;

    const roundTimeline = matchData.roundTimeline ?? [];
    const economyTimeline = matchData.economyTimeline ?? [];
    const weaponSummaries = matchData.weaponSummaries ?? [];

    const roundCount = roundTimeline.length || player?.stats?.roundsPlayed || roundResults.length || 1;
    const myTeamScore = matchData.teams.find((t) => t.teamId === teamId)?.roundsWon ?? 0;
    const enemyTeamScore = matchData.teams.find((t) => t.teamId !== teamId)?.roundsWon ?? 0;

    const analytics = useMemo(() => {
        if (!roundResults.length || !player) return null;
        const rounds = roundResults as Array<{
            playerStats?: Array<{
                puuid: string;
                damage?: Array<{ headshots?: number; bodyshots?: number; legshots?: number }>;
                kills?: Array<{ killer?: string; victim?: string; timeSinceRoundStartMillis?: number; assistants?: string[] }>;
            }>;
        }>;
        const players = matchData.players;
        const playerStatsMap: Record<string, { kastCount: number; fd: number; hits: { head: number; body: number; leg: number } }> = {};
        const hasEnriched = Boolean(matchData.enrichedPlayers?.length);

        players.forEach((p) => {
            playerStatsMap[p.puuid] = { kastCount: 0, fd: 0, hits: { head: 0, body: 0, leg: 0 } };
        });

        rounds.forEach((round) => {
            if (!hasEnriched) {
                const allKills = (round.playerStats ?? []).flatMap((ps) =>
                    (ps.kills ?? []).map((k) => ({ killer: k.killer || ps.puuid, victim: k.victim, time: k.timeSinceRoundStartMillis ?? 0 })),
                ).filter((k) => k.killer && k.victim && k.killer !== k.victim);
                allKills.sort((a, b) => a.time - b.time);
                const fb = allKills[0];
                if (fb?.victim && playerStatsMap[fb.victim]) playerStatsMap[fb.victim].fd += 1;
            }

            round.playerStats?.forEach((ps) => {
                ps.damage?.forEach((d) => {
                    if (!playerStatsMap[ps.puuid]) return;
                    playerStatsMap[ps.puuid].hits.head += d.headshots ?? 0;
                    playerStatsMap[ps.puuid].hits.body += d.bodyshots ?? 0;
                    playerStatsMap[ps.puuid].hits.leg += d.legshots ?? 0;
                });
            });

            players.forEach((p) => {
                const ps = round.playerStats?.find((s) => s.puuid === p.puuid);
                const killed = (ps?.kills?.length ?? 0) > 0;
                const assisted = players.some((o) => o.puuid !== p.puuid && round.playerStats?.some((os) =>
                    os.puuid === o.puuid && os.kills?.some((k) => k.assistants?.includes(p.puuid))));
                const survived = !round.playerStats?.some((os) => os.kills?.some((k) => k.victim === p.puuid));
                if (killed || assisted || survived) playerStatsMap[p.puuid].kastCount += 1;
            });
        });

        return { playerStatsMap };
    }, [matchData, player, roundResults]);

    const targetKast = analytics
        ? Math.round((analytics.playerStatsMap[targetPuuid]?.kastCount ?? 0) / roundCount * 100)
        : 0;

    if (!player) {
        return (
            <div className="rounded-xl border border-white/5 bg-[#0a0a0c] p-4 text-center">
                <p className="text-sm text-zinc-400">Player data not found in this match.</p>
            </div>
        );
    }

    const agentIcon = enrichedTarget?.displayAgentIcon
        ?? (player.characterId ? `https://media.valorant-api.com/agents/${player.characterId}/displayicon.png` : null);

    const hits = analytics?.playerStatsMap[targetPuuid]?.hits ?? { head: 0, body: 0, leg: 0 };
    const totalHits = hits.head + hits.body + hits.leg;
    const hsPct = enrichedTarget?.hsPct ?? (totalHits > 0 ? Math.round((hits.head / totalHits) * 100) : null);

    const renderScoreboard = (players: EnrichedRiotMatchData['players'], side: 'Blue' | 'Red') => (
        <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1 text-left text-[11px]">
                <thead>
                    <tr className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                        <th className="pb-2 pl-3">Player</th>
                        <th className="pb-2 text-center">ACS</th>
                        <th className="pb-2 text-center">K/D/A</th>
                        <th className="pb-2 text-center">ADR</th>
                        <th className="pb-2 text-center">HS%</th>
                        <th className="pb-2 text-center">Util</th>
                    </tr>
                </thead>
                <tbody>
                    {players.filter((p) => p.teamId === side).sort((a, b) => b.stats.score - a.stats.score).map((p) => {
                        const enriched = resolveEnrichedPlayer(matchData, p.puuid);
                        const icon = enriched?.displayAgentIcon
                            ?? (p.characterId ? `https://media.valorant-api.com/agents/${p.characterId}/displayicon.png` : null);
                        const acs = enriched?.acs ?? Math.round(p.stats.score / Math.max(1, roundCount));
                        const adr = enriched?.adr ?? '-';
                        const pHits = analytics?.playerStatsMap[p.puuid]?.hits ?? { head: 0, body: 0, leg: 0 };
                        const pTotal = pHits.head + pHits.body + pHits.leg;
                        const hs = enriched?.hsPct ?? (pTotal > 0 ? Math.round((pHits.head / pTotal) * 100) : '-');
                        return (
                            <tr
                                key={p.puuid}
                                className={p.puuid === targetPuuid ? 'bg-zinc-800/70 ring-1 ring-white/10' : 'hover:bg-zinc-900/40'}
                            >
                                <td className="rounded-l py-2 pl-3">
                                    <div className="flex items-center gap-2">
                                        {icon ? <img src={icon} alt="" className="h-7 w-7 rounded object-cover" loading="lazy" /> : null}
                                        <span className="font-semibold text-zinc-200">{p.gameName}<span className="text-zinc-500">#{p.tagLine}</span></span>
                                    </div>
                                </td>
                                <td className="text-center font-bold text-zinc-300">{acs}</td>
                                <td className="text-center tabular-nums text-white">{p.stats.kills}/{p.stats.deaths}/{p.stats.assists}</td>
                                <td className="text-center text-zinc-400">{adr}</td>
                                <td className="text-center text-zinc-400">{typeof hs === 'number' ? `${hs}%` : hs}</td>
                                <td className="text-center text-zinc-500">{formatAbilityCasts(enriched?.abilityCasts ?? p.stats.abilityCasts)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: LayoutGrid },
        { id: 'scoreboard' as const, label: 'Scoreboard', icon: List },
        { id: 'economy' as const, label: 'Economy', icon: BarChart3 },
        { id: 'rounds' as const, label: 'Rounds', icon: Zap },
        { id: 'weapons' as const, label: 'Weapons', icon: Crosshair },
    ];

    return (
        <Card className={`overflow-hidden border border-zinc-800 bg-zinc-950/80 ${isWin ? 'border-l-4 border-l-emerald-600' : 'border-l-4 border-l-rose-600'}`}>
            <button
                type="button"
                className="relative w-full p-5 text-left transition-colors hover:bg-white/[0.02]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {mapSplash ? (
                    <div
                        className="pointer-events-none absolute inset-0 opacity-20"
                        style={{ backgroundImage: `linear-gradient(90deg, #09090b 40%, transparent), url(${mapSplash})`, backgroundSize: 'cover', backgroundPosition: 'right center' }}
                    />
                ) : null}
                <div className="relative grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div className="flex items-center gap-3">
                        {agentIcon ? (
                            <img src={agentIcon} alt="" className="h-14 w-14 rounded-lg border border-white/10 object-cover" loading="lazy" />
                        ) : null}
                        <div>
                            <p className="font-heading text-lg font-bold text-white">{mapName}</p>
                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                                {gameMode}
                                {parsedInfo?.isRanked ? ' · Ranked' : ''}
                                {' · '}{formatDuration(matchData.matchInfo.gameLengthMillis)}
                                {region ? ` · ${region}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        <StatTile label="K/D/A" value={`${player.stats.kills}/${player.stats.deaths}/${player.stats.assists}`} />
                        <StatTile label="Score" value={`${myTeamScore}-${enemyTeamScore}`} accent={isWin ? 'text-emerald-400' : 'text-rose-400'} />
                        <StatTile label="ACS" value={enrichedTarget?.acs ?? '-'} />
                        <StatTile label="ADR" value={enrichedTarget?.adr ?? '-'} />
                        <StatTile label="KAST" value={`${targetKast}%`} />
                        <StatTile label="FK" value={enrichedTarget?.firstBloods ?? 0} accent="text-emerald-400" />
                    </div>

                    <div className="flex items-center justify-end gap-2 text-zinc-500">
                        {isWin ? <Trophy className="h-4 w-4 text-emerald-500" /> : <Skull className="h-4 w-4 text-rose-500" />}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>
            </button>

            {isExpanded ? (
                <div className="border-t border-white/10 bg-black/40">
                    <div className="flex gap-6 overflow-x-auto border-b border-white/5 px-5 py-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                                    activeTab === tab.id ? 'border-rose-500 text-rose-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-5">
                        {activeTab === 'overview' ? (
                            <div className="space-y-6">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatTile label="Headshot %" value={hsPct !== null ? `${formatStat(hsPct)}%` : '-'} />
                                    <StatTile label="K/D" value={enrichedTarget?.kdRatio ?? '-'} />
                                    <StatTile label="Rounds" value={roundCount} />
                                    <StatTile label="Utility casts" value={formatAbilityCasts(enrichedTarget?.abilityCasts ?? player.stats.abilityCasts)} />
                                </div>
                                {roundTimeline.length > 0 ? <RiotRoundTimeline rounds={roundTimeline} /> : null}
                            </div>
                        ) : null}

                        {activeTab === 'scoreboard' ? (
                            <div className="space-y-6">
                                <div>
                                    <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-blue-400">Blue</p>
                                    {renderScoreboard(matchData.players, 'Blue')}
                                </div>
                                <div>
                                    <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-rose-400">Red</p>
                                    {renderScoreboard(matchData.players, 'Red')}
                                </div>
                            </div>
                        ) : null}

                        {activeTab === 'economy' ? <RiotEconomyChart economy={economyTimeline} /> : null}
                        {activeTab === 'rounds' ? <RiotRoundTimeline rounds={roundTimeline} /> : null}
                        {activeTab === 'weapons' ? <RiotWeaponSummaries weapons={weaponSummaries} /> : null}
                    </div>
                </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-white/5 px-5 py-2 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                <span>Match {matchData.matchInfo.matchId?.slice(0, 8)}…</span>
                <span>{roundTimeline.length} rounds · {weaponSummaries.length} weapons</span>
            </div>
        </Card>
    );
};

export default MatchHistoryCard;
