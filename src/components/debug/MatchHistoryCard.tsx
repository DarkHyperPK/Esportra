import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Trophy, Skull, Map as MapIcon, ChevronDown, ChevronUp, Zap, List, BarChart3, Crosshair } from 'lucide-react';
import {
    RiotEconomyChart,
    RiotRoundTimeline,
    RiotWeaponSummaries,
} from '@/components/tournament/RiotMatchAnalytics';
import { RiotTimelineMap, type ValorantMapMetadata } from '@/components/debug/RiotTimelineMap';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import { resolveEnrichedPlayer } from '@/types/enrichedRiotMatch';
import { formatAbilityCasts, formatStat } from '@/types/scoreboardPlayer';
import { resolveRoundResultCode } from '@/types/riotMatchDetails';

interface MatchHistoryCardProps {
    matchData: EnrichedRiotMatchData;
    targetPuuid: string;
}

interface CompetitiveTierMetadata {
    tier: number;
    tierName?: string;
    divisionName?: string;
    smallIcon?: string;
    largeIcon?: string;
}

function buildCompetitiveTierMap(
    entries: Array<{ tiers?: CompetitiveTierMetadata[] }>,
): Record<number, CompetitiveTierMetadata> {
    const latestWithRanks = entries
        .slice()
        .reverse()
        .find((entry) => entry.tiers?.some((tier) => tier.largeIcon || tier.smallIcon));

    const tiers: Record<number, CompetitiveTierMetadata> = {};
    latestWithRanks?.tiers?.forEach((tier) => {
        if (typeof tier.tier === 'number') {
            tiers[tier.tier] = tier;
        }
    });
    return tiers;
}

function formatRankName(rank?: CompetitiveTierMetadata, tierNumber?: number): string {
    if (!tierNumber || tierNumber <= 0) return 'Unrated';
    const name = rank?.tierName || rank?.divisionName;
    if (!name) return `Tier ${tierNumber}`;
    return name
        .replace('Ascendant', 'Asc')
        .replace('Immortal', 'Imm')
        .replace('Diamond', 'Dia')
        .replace('Platinum', 'Plat')
        .replace('Gold', 'Gold')
        .replace('Silver', 'Silv')
        .replace('Bronze', 'Bronze')
        .replace('Iron', 'Iron');
}

const MatchHistoryCard: React.FC<MatchHistoryCardProps> = ({ matchData, targetPuuid }) => {
    const [agentData, setAgentData] = useState<{ displayIcon?: string } | null>(null);
    const [mapData, setMapData] = useState<ValorantMapMetadata | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'scoreboard' | 'timeline' | 'economy' | 'rounds' | 'weapons'>('scoreboard');
    const [allAgents, setAllAgents] = useState<Record<string, { displayIcon?: string; displayName?: string }>>({});
    const [competitiveTiers, setCompetitiveTiers] = useState<Record<number, CompetitiveTierMetadata>>({});

    const player = matchData.players.find((entry) => entry.puuid === targetPuuid);
    const enrichedTarget = resolveEnrichedPlayer(matchData, targetPuuid);
    const teamId = player?.teamId;
    const isWin = matchData.teams.find((team) => team.teamId === teamId)?.won;
    const parsedInfo = matchData.matchInfoParsed;
    const roundResults = matchData.roundResults ?? [];

    const analytics = useMemo(() => {
        if (!roundResults.length || !player) return null;

        const rounds = roundResults as Array<{
            roundNum?: number;
            playerStats?: Array<{
                puuid: string;
                economy?: { spent?: number };
                damage?: Array<{ headshots?: number; bodyshots?: number; legshots?: number }>;
                kills?: Array<{ killer?: string; victim?: string; timeSinceRoundStartMillis?: number; assistants?: string[] }>;
            }>;
        }>;
        const players = matchData.players;

        const economyData = matchData.economyTimeline?.length
            ? matchData.economyTimeline.map((entry) => ({
                round: entry.round,
                blueBank: entry.blueSpent,
                redBank: entry.redSpent,
                blueLoadout: entry.blueLoadout ?? 0,
                redLoadout: entry.redLoadout ?? 0,
            }))
            : rounds.map((round, index) => {
                let blueBank = 0;
                let redBank = 0;
                round.playerStats?.forEach((ps) => {
                    const p = players.find((pl) => pl.puuid === ps.puuid);
                    const spent = ps.economy?.spent ?? 0;
                    if (p?.teamId === 'Blue') blueBank += spent;
                    else if (p?.teamId === 'Red') redBank += spent;
                });
                const roundNumber = round.roundNum && round.roundNum > 0 ? round.roundNum : index + 1;
                return { round: roundNumber, blueBank, redBank, blueLoadout: 0, redLoadout: 0 };
            });

        const playerStatsMap: Record<string, {
            kastCount: number;
            fb: number;
            fd: number;
            multiKills: Record<2 | 3 | 4 | 5, number>;
            hits: { head: number; body: number; leg: number };
        }> = {};

        const hasEnrichedStats = Boolean(matchData.enrichedPlayers?.length);

        players.forEach((p) => {
            const enriched = resolveEnrichedPlayer(matchData, p.puuid);
            playerStatsMap[p.puuid] = {
                kastCount: 0,
                fb: enriched?.firstBloods ?? 0,
                fd: 0,
                multiKills: { 2: 0, 3: 0, 4: 0, 5: 0 },
                hits: { head: 0, body: 0, leg: 0 },
            };
        });

        rounds.forEach((round) => {
            if (!hasEnrichedStats) {
                const allKills = (round.playerStats ?? []).flatMap((ps) =>
                    (ps.kills ?? []).map((kill) => ({
                        ...kill,
                        killer: kill.killer || ps.puuid,
                        victim: kill.victim,
                    })),
                ).filter((kill) => kill.killer && kill.victim && kill.killer !== kill.victim);

                allKills.sort(
                    (a, b) => (a.timeSinceRoundStartMillis ?? 0) - (b.timeSinceRoundStartMillis ?? 0),
                );

                const firstBlood = allKills[0];
                if (firstBlood?.killer && playerStatsMap[firstBlood.killer]) {
                    playerStatsMap[firstBlood.killer].fb += 1;
                    if (firstBlood.victim && playerStatsMap[firstBlood.victim]) {
                        playerStatsMap[firstBlood.victim].fd += 1;
                    }
                }
            }

            round.playerStats?.forEach((ps) => {
                ps.damage?.forEach((damageEntry) => {
                    if (!playerStatsMap[ps.puuid]) return;
                    playerStatsMap[ps.puuid].hits.head += damageEntry.headshots ?? 0;
                    playerStatsMap[ps.puuid].hits.body += damageEntry.bodyshots ?? 0;
                    playerStatsMap[ps.puuid].hits.leg += damageEntry.legshots ?? 0;
                });
            });

            players.forEach((p) => {
                const ps = round.playerStats?.find((entry) => entry.puuid === p.puuid);
                const killedSomeone = (ps?.kills?.length ?? 0) > 0;
                const gotAssist = players.some((other) =>
                    other.puuid !== p.puuid
                    && round.playerStats?.some((os) =>
                        os.puuid === other.puuid
                        && os.kills?.some((kill) => kill.assistants?.includes(p.puuid)),
                    ),
                );
                const survived = !round.playerStats?.some((os) =>
                    os.kills?.some((kill) => kill.victim === p.puuid),
                );

                let traded = false;
                const death = round.playerStats
                    ?.flatMap((os) => os.kills ?? [])
                    .find((kill) => kill.victim === p.puuid);
                if (death?.killer) {
                    const victimTeammates = players.filter(
                        (teammate) => teammate.teamId === p.teamId && teammate.puuid !== p.puuid,
                    );
                    traded = round.playerStats?.some((os) =>
                        victimTeammates.some((teammate) => teammate.puuid === os.puuid)
                        && os.kills?.some((kill) =>
                            kill.victim === death.killer
                            && Math.abs(
                                (kill.timeSinceRoundStartMillis ?? 0) - (death.timeSinceRoundStartMillis ?? 0),
                            ) < 4000,
                        ),
                    ) ?? false;
                }

                if (killedSomeone || gotAssist || survived || traded) {
                    playerStatsMap[p.puuid].kastCount += 1;
                }

                const killCount = ps?.kills?.length ?? 0;
                if (killCount >= 2) {
                    const count = Math.min(killCount, 5) as 2 | 3 | 4 | 5;
                    playerStatsMap[p.puuid].multiKills[count] += 1;
                }
            });
        });

        return {
            economyData,
            playerStatsMap,
            roundCount: matchData.roundTimeline?.length
                ?? player.stats?.roundsPlayed
                ?? rounds.length
                ?? 1,
        };
    }, [matchData, player, roundResults]);

    const roundCount = analytics?.roundCount ?? 1;

    const targetKAST = analytics
        ? Math.round((analytics.playerStatsMap[targetPuuid]?.kastCount ?? 0) / roundCount * 100)
        : 0;

    useEffect(() => {
        if (player?.characterId) {
            fetch(`https://valorant-api.com/v1/agents/${player.characterId}`)
                .then((res) => res.json())
                .then((data) => setAgentData(data.data));
        }

        fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')
            .then((res) => res.json())
            .then((data) => {
                const map: Record<string, { displayIcon?: string; displayName?: string }> = {};
                data.data.forEach((agent: { uuid: string; displayIcon?: string; displayName?: string }) => {
                    map[agent.uuid.toLowerCase()] = agent;
                });
                setAllAgents(map);
            });

        const mapUri = matchData.matchInfo.mapId;
        fetch('https://valorant-api.com/v1/maps')
            .then((res) => res.json())
            .then((data) => {
                const foundMap = data.data.find((mapEntry: ValorantMapMetadata) => mapEntry.mapUrl === mapUri);
                setMapData(foundMap);
            });

        fetch('https://valorant-api.com/v1/competitivetiers')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data?.data)) {
                    setCompetitiveTiers(buildCompetitiveTierMap(data.data));
                }
            })
            .catch(() => undefined);
    }, [player?.characterId, matchData.matchInfo.mapId]);

    if (!player) {
        return (
            <div className="rounded-xl border border-white/5 bg-[#0a0a0c] p-4 text-center">
                <p className="text-sm text-zinc-400">Player data not found in this match.</p>
            </div>
        );
    }

    const renderScoreboardTable = (players: EnrichedRiotMatchData['players']) => (
        <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1 text-left text-[11px]">
                <thead>
                    <tr className="font-black uppercase tracking-tighter text-zinc-500">
                        <th className="pb-2 pl-4">Player</th>
                        <th className="pb-2 text-left">Rank</th>
                        <th className="pb-2 text-center">ACS</th>
                        <th className="pb-2 text-center">K</th>
                        <th className="pb-2 text-center">D</th>
                        <th className="pb-2 text-center">A</th>
                        <th className="pb-2 text-center">+/-</th>
                        <th className="pb-2 text-center">K/D</th>
                        <th className="pb-2 text-center">HS%</th>
                        <th className="pb-2 text-center">ADR</th>
                        <th className="pb-2 text-center">Util</th>
                        <th className="pb-2 text-center">KAST</th>
                        <th className="pb-2 text-center">FK</th>
                        <th className="pb-2 text-center">FD</th>
                    </tr>
                </thead>
                <tbody>
                    {players
                        .slice()
                        .sort((a, b) => b.stats.score - a.stats.score)
                        .map((p) => {
                            const agent = allAgents[p.characterId?.toLowerCase() ?? ''];
                            const rank = competitiveTiers[p.competitiveTier ?? 0];
                            const pAnalytics = analytics?.playerStatsMap[p.puuid];
                            const enriched = resolveEnrichedPlayer(matchData, p.puuid);

                            const hits = pAnalytics?.hits ?? { head: 0, body: 0, leg: 0 };
                            const totalHits = hits.head + hits.body + hits.leg;
                            const hsPerc = enriched?.hsPct ?? (totalHits > 0 ? Math.round((hits.head / totalHits) * 100) : 0);
                            const adr = enriched?.adr ?? Math.round(p.stats.score / Math.max(1, roundCount));
                            const acs = enriched?.acs ?? Math.round(p.stats.score / Math.max(1, roundCount));

                            const killDiff = p.stats.kills - p.stats.deaths;
                            const kdRatio = enriched?.kdRatio
                                ?? (p.stats.deaths > 0
                                    ? (p.stats.kills / p.stats.deaths).toFixed(2)
                                    : String(p.stats.kills));
                            const diffColor = killDiff > 0 ? 'text-emerald-400' : (killDiff < 0 ? 'text-rose-400' : 'text-zinc-500');
                            const kdColor = Number(kdRatio) >= 1 ? 'text-emerald-400' : 'text-rose-400';

                            return (
                                <tr
                                    key={p.puuid}
                                    className={`group/row transition-all duration-300 ${
                                        p.puuid === targetPuuid
                                            ? 'bg-zinc-800/80 shadow-lg ring-1 ring-white/10'
                                            : 'hover:bg-zinc-900/40'
                                    }`}
                                >
                                    <td className="rounded-l-lg py-2 pl-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 overflow-hidden rounded border border-white/5 bg-black/40">
                                                {agent?.displayIcon ? (
                                                    <img src={agent.displayIcon} loading="lazy" className="h-full w-full" alt="" />
                                                ) : null}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1 font-bold text-zinc-200">
                                                    {p.gameName}{' '}
                                                    <span className="font-normal text-zinc-500">#{p.tagLine}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2">
                                        <div className="flex min-w-[96px] items-center gap-2">
                                            {rank?.smallIcon || rank?.largeIcon ? (
                                                <img
                                                    src={rank.smallIcon || rank.largeIcon}
                                                    loading="lazy"
                                                    className="h-6 w-6 object-contain drop-shadow"
                                                    alt=""
                                                />
                                            ) : (
                                                <span className="h-2 w-2 rounded-full bg-zinc-700" />
                                            )}
                                            <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-tight text-zinc-300">
                                                {formatRankName(rank, p.competitiveTier)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-center font-bold text-zinc-300">{acs}</td>
                                    <td className="text-center font-bold text-white">{p.stats.kills}</td>
                                    <td className="text-center text-zinc-400">{p.stats.deaths}</td>
                                    <td className="text-center text-zinc-400">{p.stats.assists}</td>
                                    <td className={`text-center font-bold ${diffColor}`}>
                                        {killDiff > 0 ? `+${killDiff}` : killDiff}
                                    </td>
                                    <td className={`text-center font-bold ${kdColor}`}>{kdRatio}</td>
                                    <td className="text-center font-mono text-white/90">{formatStat(hsPerc)}%</td>
                                    <td className="text-center text-zinc-300">{adr}</td>
                                    <td className="text-center text-zinc-400">
                                        {formatAbilityCasts(enriched?.abilityCasts ?? p.stats.abilityCasts)}
                                    </td>
                                    <td className="text-center font-mono italic text-zinc-400">
                                        {analytics
                                            ? `${Math.round((pAnalytics?.kastCount ?? 0) / roundCount * 100)}%`
                                            : '-'}
                                    </td>
                                    <td className="text-center font-bold text-emerald-500">
                                        {enriched?.firstBloods ?? pAnalytics?.fb ?? 0}
                                    </td>
                                    <td className="text-center font-bold text-rose-500">{pAnalytics?.fd ?? 0}</td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
        </div>
    );

    const roundTimeline = matchData.roundTimeline ?? [];
    const economyTimeline = matchData.economyTimeline ?? [];
    const weaponSummaries = matchData.weaponSummaries ?? [];
    const gameModeLabel = parsedInfo?.gameMode || matchData.matchInfo.gameMode;
    const rankedLabel = parsedInfo?.isRanked ?? matchData.matchInfo.isRanked;

    return (
        <Card className={`group relative overflow-hidden border border-zinc-900 border-l-4 bg-zinc-950/60 shadow-2xl backdrop-blur-xl transition-all duration-500 ${isWin ? 'border-l-emerald-600' : 'border-l-rose-600'}`}>
            <div
                className="relative z-10 flex cursor-pointer items-center gap-6 p-5 transition-colors hover:bg-white/5"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="relative h-16 w-16 flex-shrink-0">
                    {agentData?.displayIcon ? (
                        <img
                            src={agentData.displayIcon}
                            loading="lazy"
                            className="h-full w-full rounded-xl border border-zinc-800 bg-zinc-900 object-cover shadow-xl transition-transform duration-500 group-hover:scale-110"
                            alt=""
                        />
                    ) : null}
                    <div className={`absolute -bottom-2 -right-2 rounded-full border p-1.5 ${isWin ? 'border-emerald-400 bg-emerald-500' : 'border-rose-400 bg-rose-500'}`}>
                        {isWin ? <Trophy className="h-3 w-3 text-white" /> : <Skull className="h-3 w-3 text-white" />}
                    </div>
                </div>

                <div className="grid flex-grow grid-cols-2 items-center gap-4 md:grid-cols-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-black text-white">
                            <MapIcon className="h-4 w-4 text-rose-500" /> {mapData?.displayName || 'Loading…'}
                        </div>
                        <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {matchData.matchInfo.queueId || 'Custom'}
                            {gameModeLabel ? ` · ${gameModeLabel}` : ''}
                            {rankedLabel ? ' · Ranked' : ''}
                            {' · '}
                            {Math.round((matchData.matchInfo.gameLengthMillis ?? 0) / 60000)}M
                        </div>
                        {parsedInfo?.region ? (
                            <div className="mt-1 text-[9px] uppercase tracking-wider text-zinc-600">
                                Region {parsedInfo.region}
                            </div>
                        ) : null}
                    </div>

                    <div className="text-center">
                        <div className="text-2xl font-black leading-none tracking-tighter text-white drop-shadow-lg">
                            {player.stats.kills}
                            <span className="mx-1 text-zinc-500">/</span>
                            {player.stats.deaths}
                            <span className="mx-1 text-zinc-500">/</span>
                            {player.stats.assists}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-3">
                            <div className="text-[10px] font-black uppercase text-zinc-400 drop-shadow-md">
                                KD{' '}
                                <span className="text-white">
                                    {(player.stats.kills / Math.max(1, player.stats.deaths)).toFixed(2)}
                                </span>
                            </div>
                            <div className="h-1 w-1 rounded-full bg-zinc-600" />
                            <div className="text-[10px] font-black uppercase text-zinc-400 drop-shadow-md">
                                ACS <span className="text-white">{enrichedTarget?.acs ?? '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden text-center md:block">
                        <div className="flex justify-center gap-3 text-2xl font-black">
                            <span className={isWin ? 'text-emerald-500' : 'text-rose-500'}>
                                {matchData.teams.find((team) => team.teamId === teamId)?.roundsWon}
                            </span>
                            <span className="text-zinc-500">/</span>
                            <span className={!isWin ? 'text-emerald-500' : 'text-rose-500'}>
                                {matchData.teams.find((team) => team.teamId !== teamId)?.roundsWon}
                            </span>
                        </div>
                        <div className="mt-1 text-[10px] font-black uppercase text-zinc-400 drop-shadow-md">
                            Match Score
                        </div>
                    </div>

                    <div className="flex flex-col items-end pr-4">
                        <div className="flex gap-4 text-right">
                            <div>
                                <div className="text-[9px] font-black text-zinc-400 drop-shadow-md">KAST</div>
                                <div className="font-mono text-xs text-zinc-300 drop-shadow-md">{targetKAST}%</div>
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-zinc-400 drop-shadow-md">FK</div>
                                <div className="font-mono text-xs text-emerald-400 drop-shadow-md">
                                    {enrichedTarget?.firstBloods ?? analytics?.playerStatsMap[targetPuuid]?.fb ?? 0}
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 text-zinc-700 transition-colors">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 animate-bounce" />}
                        </div>
                    </div>
                </div>

                {mapData?.listViewIcon ? (
                    <div
                        className="pointer-events-none absolute right-0 top-0 h-full w-2/3 opacity-40 transition-all duration-500 group-hover:opacity-60"
                        style={{
                            backgroundImage: `linear-gradient(to left, rgba(9, 9, 11, 1) 20%, rgba(9, 9, 11, 0.6) 60%, rgba(9, 9, 11, 0.2)), url(${mapData.listViewIcon})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'right center',
                            filter: 'contrast(1.1) brightness(0.7)',
                        }}
                    />
                ) : null}
            </div>

            {isExpanded ? (
                <div className="animate-in slide-in-from-top-4 border-t border-white/10 bg-black/60 duration-500 backdrop-blur-3xl">
                    <div className="scroller-hide flex items-center gap-8 overflow-x-auto border-b border-white/5 px-8 py-4">
                        {[
                            { id: 'scoreboard', label: 'Scoreboard', icon: List },
                            { id: 'timeline', label: 'Timeline', icon: MapIcon },
                            { id: 'economy', label: 'Economy', icon: BarChart3 },
                            { id: 'rounds', label: 'Rounds', icon: Zap },
                            { id: 'weapons', label: 'Weapons', icon: Crosshair },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-2 border-b-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                    activeTab === tab.id
                                        ? 'border-rose-500 text-rose-500'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {activeTab === 'scoreboard' ? (
                            <div className="animate-in fade-in space-y-8 duration-500">
                                <div>
                                    <div className="mb-3 flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                                        <div className="h-4 w-1.5 rounded-full bg-blue-500" /> Blue Team
                                    </div>
                                    {renderScoreboardTable(matchData.players.filter((entry) => entry.teamId === 'Blue'))}
                                </div>
                                <div>
                                    <div className="mb-3 flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-rose-500">
                                        <div className="h-4 w-1.5 rounded-full bg-rose-500" /> Red Team
                                    </div>
                                    {renderScoreboardTable(matchData.players.filter((entry) => entry.teamId === 'Red'))}
                                </div>
                            </div>
                        ) : null}

                        {activeTab === 'timeline' ? (
                            <div className="animate-in fade-in duration-500">
                                <RiotTimelineMap
                                    matchData={matchData}
                                    targetPuuid={targetPuuid}
                                    mapData={mapData}
                                    agents={allAgents}
                                />
                            </div>
                        ) : null}

                        {activeTab === 'economy' ? (
                            <div className="animate-in zoom-in-95 duration-500">
                                {economyTimeline.length > 0 ? (
                                    <RiotEconomyChart economy={economyTimeline} />
                                ) : (
                                    <RiotEconomyChart
                                        economy={(analytics?.economyData ?? []).map((entry) => ({
                                            round: entry.round,
                                            blueSpent: entry.blueBank,
                                            redSpent: entry.redBank,
                                            blueLoadout: entry.blueLoadout,
                                            redLoadout: entry.redLoadout,
                                        }))}
                                    />
                                )}
                            </div>
                        ) : null}

                        {activeTab === 'rounds' ? (
                            <div className="animate-in slide-in-from-right-4 duration-500">
                                {roundTimeline.length > 0 ? (
                                    <RiotRoundTimeline rounds={roundTimeline} />
                                ) : (
                                    <div className="space-y-4">
                                        <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                                            Round Timeline
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {(roundResults as Array<{ roundNum?: number; winningTeam?: string; roundResultCode?: string; roundResult?: string }>).map((round, index) => {
                                                const roundNumber = round.roundNum && round.roundNum > 0 ? round.roundNum : index + 1;
                                                const isBlueWin = round.winningTeam === 'Blue';
                                                const resultCode = resolveRoundResultCode({
                                                    round: roundNumber,
                                                    winningTeam: round.winningTeam ?? '',
                                                    resultCode: round.roundResultCode,
                                                    result: round.roundResult,
                                                });
                                                return (
                                                    <div
                                                        key={roundNumber}
                                                        title={resultCode ?? round.winningTeam}
                                                        className={`flex h-12 w-10 flex-col items-center justify-center gap-1 border ${
                                                            isBlueWin
                                                                ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                                                                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                                        }`}
                                                    >
                                                        <span className="text-[8px] font-bold opacity-70">{roundNumber}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {activeTab === 'weapons' ? (
                            <div className="animate-in fade-in duration-500">
                                <RiotWeaponSummaries weapons={weaponSummaries} />
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between border-t border-white/5 px-8 pb-6 pt-4 opacity-30">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    <Zap className="h-3 w-3 text-rose-500" />
                    ENRICHED MATCH DATA • ID: {matchData.matchInfo.matchId?.slice(0, 12)}…
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    {roundTimeline.length} rounds • {weaponSummaries.length} weapon types
                </div>
            </div>
        </Card>
    );
};

export default MatchHistoryCard;
