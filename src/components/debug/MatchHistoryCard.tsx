import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Trophy, Skull, Map as MapIcon, ChevronDown, ChevronUp, Zap, List, BarChart3, Crosshair } from 'lucide-react';
import {
    RiotEconomyChart,
    RiotWeaponSummaries,
} from '@/components/tournament/RiotMatchAnalytics';
import { RiotTimelineMap, type ValorantMapMetadata } from '@/components/debug/RiotTimelineMap';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import { resolveEnrichedPlayer } from '@/types/enrichedRiotMatch';
import { formatAbilityCasts, formatStat } from '@/types/scoreboardPlayer';
import { resolveRoundResultCode, type RiotRoundResult, type RoundTimelineEntry } from '@/types/riotMatchDetails';
import { cn } from '@/lib/utils';

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

interface ValorantAgentMetadata {
    uuid: string;
    displayIcon?: string;
    displayName?: string;
    abilities?: Array<{
        slot?: string;
        displayIcon?: string;
        displayName?: string;
    }>;
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

function getRoundResultMeta(code?: string | null) {
    if (code === 'Elimination') return { label: 'Elimination', short: 'ELIM', tone: 'text-white' };
    if (code === 'Detonate') return { label: 'Spike detonated', short: 'BOOM', tone: 'text-amber-100' };
    if (code === 'Defuse') return { label: 'Spike defused', short: 'DEF', tone: 'text-cyan-100' };
    if (code === 'TimeOut') return { label: 'Time expired', short: 'TIME', tone: 'text-slate-100' };
    return { label: code || 'Round win', short: 'WIN', tone: 'text-white' };
};

function formatRoundNumber(round: RiotRoundResult, index: number): number {
    return typeof round.roundNum === 'number' ? round.roundNum + 1 : index + 1;
}

function normalizeRoundResult(round: RiotRoundResult, roundNumber: number): RoundTimelineEntry {
    return {
        round: roundNumber,
        winningTeam: round.winningTeam ?? '',
        resultCode: round.roundResultCode,
        result: round.roundResult,
        plantSite: round.plantSite,
    };
}

type ValorantTeamId = 'Blue' | 'Red';

function isValorantTeamId(value?: string | null): value is ValorantTeamId {
    return value === 'Blue' || value === 'Red';
}

function getOppositeTeam(team: ValorantTeamId): ValorantTeamId {
    return team === 'Red' ? 'Blue' : 'Red';
}

function getRoundSideSegment(round: number): 'first' | 'second' | 'ot-attack-red' | 'ot-attack-blue' {
    if (round <= 12) return 'first';
    if (round <= 24) return 'second';
    return round % 2 === 1 ? 'ot-attack-red' : 'ot-attack-blue';
}

function getFallbackAttackingTeam(round: number): ValorantTeamId {
    if (round <= 12) return 'Red';
    if (round <= 24) return 'Blue';
    return round % 2 === 1 ? 'Red' : 'Blue';
}

const MatchHistoryCard: React.FC<MatchHistoryCardProps> = ({ matchData, targetPuuid }) => {
    const [agentData, setAgentData] = useState<{ displayIcon?: string } | null>(null);
    const [mapData, setMapData] = useState<ValorantMapMetadata | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'scoreboard' | 'timeline' | 'economy' | 'rounds' | 'weapons'>('scoreboard');
    const [selectedPuuid, setSelectedPuuid] = useState(targetPuuid);
    const [selectedRoundNumber, setSelectedRoundNumber] = useState<number | null>(null);
    const [allAgents, setAllAgents] = useState<Record<string, ValorantAgentMetadata>>({});
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
        setSelectedPuuid(targetPuuid);
    }, [targetPuuid, matchData.matchInfo.matchId]);

    useEffect(() => {
        if (player?.characterId) {
            fetch(`https://valorant-api.com/v1/agents/${player.characterId}`)
                .then((res) => res.json())
                .then((data) => setAgentData(data.data));
        }

        fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')
            .then((res) => res.json())
            .then((data) => {
                const map: Record<string, ValorantAgentMetadata> = {};
                data.data.forEach((agent: ValorantAgentMetadata) => {
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

    const roundTimeline = matchData.roundTimeline ?? [];
    const economyTimeline = matchData.economyTimeline ?? [];
    const weaponSummaries = matchData.weaponSummaries ?? [];

    const debugRounds = useMemo(() => {
        const rawRounds = roundResults as RiotRoundResult[];
        const rawByRound = new Map<number, RiotRoundResult>();
        rawRounds.forEach((round, index) => {
            rawByRound.set(formatRoundNumber(round, index), round);
        });

        if (roundTimeline.length) {
            return roundTimeline.map((round) => ({
                summary: round,
                raw: rawByRound.get(round.round) ?? null,
            }));
        }

        return rawRounds.map((round, index) => {
            const roundNumber = formatRoundNumber(round, index);
            return {
                summary: normalizeRoundResult(round, roundNumber),
                raw: round,
            };
        });
    }, [roundResults, roundTimeline]);

    const playersByPuuid = useMemo(
        () => new Map(matchData.players.map((entry) => [entry.puuid, entry])),
        [matchData.players],
    );

    const attackingTeamsBySegment = useMemo(() => {
        const segmentAttackers: Record<string, ValorantTeamId> = {};
        (roundResults as RiotRoundResult[]).forEach((round, index) => {
            if (!round.bombPlanter) return;
            const planterTeam = playersByPuuid.get(round.bombPlanter)?.teamId;
            if (!isValorantTeamId(planterTeam)) return;
            segmentAttackers[getRoundSideSegment(formatRoundNumber(round, index))] = planterTeam;
        });

        if (segmentAttackers.first && !segmentAttackers.second) {
            segmentAttackers.second = getOppositeTeam(segmentAttackers.first);
        }
        if (segmentAttackers.second && !segmentAttackers.first) {
            segmentAttackers.first = getOppositeTeam(segmentAttackers.second);
        }

        return segmentAttackers;
    }, [playersByPuuid, roundResults]);

    useEffect(() => {
        setSelectedRoundNumber((current) => {
            if (current && debugRounds.some((round) => round.summary.round === current)) return current;
            return debugRounds[0]?.summary.round ?? null;
        });
    }, [debugRounds]);

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

    const gameModeLabel = parsedInfo?.gameMode || matchData.matchInfo.gameMode;
    const rankedLabel = parsedInfo?.isRanked ?? matchData.matchInfo.isRanked;

    const selectedPlayer = matchData.players.find((entry) => entry.puuid === selectedPuuid) ?? player;
    const selectedEnrichedPlayer = resolveEnrichedPlayer(matchData, selectedPlayer.puuid);
    const selectedAgent = selectedPlayer.characterId ? allAgents[selectedPlayer.characterId.toLowerCase()] : undefined;
    const selectedRank = competitiveTiers[selectedPlayer.competitiveTier ?? 0];
    const selectedAnalytics = analytics?.playerStatsMap[selectedPlayer.puuid];
    const selectedHits = selectedAnalytics?.hits ?? { head: 0, body: 0, leg: 0 };
    const selectedTotalHits = selectedHits.head + selectedHits.body + selectedHits.leg;
    const selectedHsPct = selectedEnrichedPlayer?.hsPct ?? (selectedTotalHits > 0 ? Math.round((selectedHits.head / selectedTotalHits) * 100) : 0);
    const selectedAdr = selectedEnrichedPlayer?.adr ?? Math.round(selectedPlayer.stats.score / Math.max(1, roundCount));
    const selectedAcs = selectedEnrichedPlayer?.acs ?? Math.round(selectedPlayer.stats.score / Math.max(1, roundCount));
    const selectedKd = selectedEnrichedPlayer?.kdRatio
        ?? (selectedPlayer.stats.deaths > 0
            ? (selectedPlayer.stats.kills / selectedPlayer.stats.deaths).toFixed(2)
            : String(selectedPlayer.stats.kills));
    const selectedKast = analytics
        ? Math.round((selectedAnalytics?.kastCount ?? 0) / roundCount * 100)
        : 0;
    const selectedRound = debugRounds.find((round) => round.summary.round === selectedRoundNumber) ?? debugRounds[0] ?? null;
    const targetTeam = matchData.teams.find((team) => team.teamId === teamId);
    const opponentTeam = matchData.teams.find((team) => team.teamId !== teamId);
    const targetRounds = targetTeam?.roundsWon ?? 0;
    const opponentRounds = opponentTeam?.roundsWon ?? 0;
    const resultTone = isWin
        ? {
            rail: 'border-l-[#20f5c6]',
            text: 'text-[#20f5c6]',
            soft: 'text-[#8fffe6]',
            badge: 'border-[#20f5c6]/45 bg-[#20f5c6]/16 text-[#b8fff0]',
            glow: 'shadow-[0_0_30px_rgba(32,245,198,0.18)]',
        }
        : {
            rail: 'border-l-[#ff4d6d]',
            text: 'text-[#ff4d6d]',
            soft: 'text-[#ff9aad]',
            badge: 'border-[#ff4d6d]/45 bg-[#ff4d6d]/16 text-[#ffd0d8]',
            glow: 'shadow-[0_0_30px_rgba(255,77,109,0.18)]',
        };

    const renderPremiumRounds = () => {
        if (!debugRounds.length) {
            return (
                <div className="border border-white/5 bg-[#0e1a24] px-6 py-10 text-center">
                    <p className="text-sm font-bold text-slate-300">No round timeline available.</p>
                    <p className="mt-1 text-xs text-slate-500">This match did not include round-level Riot data.</p>
                </div>
            );
        }

        const getRoundSideInfo = (roundNumber: number) => {
            const attackingTeam = attackingTeamsBySegment[getRoundSideSegment(roundNumber)] ?? getFallbackAttackingTeam(roundNumber);
            const defendingTeam = getOppositeTeam(attackingTeam);
            return { attackingTeam, defendingTeam };
        };

        const selectedSummary = selectedRound?.summary ?? debugRounds[0].summary;
        const selectedRaw = selectedRound?.raw ?? null;
        const selectedResult = resolveRoundResultCode(selectedSummary);
        const selectedMeta = getRoundResultMeta(selectedResult);
        const sideInfo = getRoundSideInfo(selectedSummary.round);
        const winningTeam = selectedSummary.winningTeam;
        const isBlueWinner = winningTeam === 'Blue';
        const winningTone = isBlueWinner ? 'text-blue-100' : 'text-rose-100';
        const winningSurface = isBlueWinner
            ? 'from-blue-500/20 via-[#0d1d31] to-[#08131f]'
            : 'from-rose-500/22 via-[#28121d] to-[#0f1118]';

        const allRoundKills = (selectedRaw?.playerStats ?? [])
            .flatMap((stats) => (stats.kills ?? []).map((kill) => ({
                ...kill,
                killer: kill.killer || stats.puuid,
            })))
            .filter((kill) => kill.killer && kill.victim && kill.killer !== kill.victim);

        const getPlayerRoundStats = (entry: EnrichedRiotMatchData['players'][number]) => {
            const rawStats = selectedRaw?.playerStats?.find((stats) => stats.puuid === entry.puuid);
            const kills = (rawStats?.kills ?? []).filter((kill) => (kill.killer || entry.puuid) === entry.puuid && kill.victim !== entry.puuid).length;
            const deaths = allRoundKills.some((kill) => kill.victim === entry.puuid) ? 1 : 0;
            const assists = allRoundKills.filter((kill) => kill.assistants?.includes(entry.puuid)).length;
            const damage = (rawStats?.damage ?? []).reduce((sum, damageEntry) => sum + (damageEntry.damage ?? 0), 0);
            return {
                kills,
                deaths,
                assists,
                damage,
                spent: rawStats?.economy?.spent ?? 0,
                loadout: rawStats?.economy?.loadoutValue ?? 0,
            };
        };

        const renderTeamRoundTable = (team: string) => {
            const teamPlayers = matchData.players
                .filter((entry) => entry.teamId === team)
                .map((entry) => ({ entry, roundStats: getPlayerRoundStats(entry) }))
                .sort((a, b) => b.roundStats.kills - a.roundStats.kills || b.roundStats.damage - a.roundStats.damage);
            const isBlue = team === 'Blue';

            return (
                <div className="min-w-0 bg-[#0e1a24]">
                    <div className={cn(
                        'flex items-center justify-between border-b border-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]',
                        isBlue ? 'bg-blue-500/10 text-blue-100' : 'bg-rose-500/10 text-rose-100',
                    )}>
                        <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2', isBlue ? 'bg-blue-300' : 'bg-rose-300')} />
                            Team {team}
                        </span>
                        <span className="text-slate-300/70">{sideInfo.attackingTeam === team ? 'Attack' : 'Defense'}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-[#101d28] text-[9px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-3 py-2">Player</th>
                                    <th className="px-2 py-2 text-center">K</th>
                                    <th className="px-2 py-2 text-center">D</th>
                                    <th className="px-2 py-2 text-center">A</th>
                                    <th className="px-2 py-2 text-right">DMG</th>
                                    <th className="px-3 py-2 text-right">Spend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamPlayers.map(({ entry, roundStats }) => {
                                    const agent = entry.characterId ? allAgents[entry.characterId.toLowerCase()] : undefined;
                                    return (
                                        <tr
                                            key={entry.puuid}
                                            className={cn(
                                                'border-t border-black/40 bg-[#0b141d] text-slate-300 transition-colors',
                                                selectedPlayer.puuid === entry.puuid && (isBlue
                                                    ? 'bg-blue-300/[0.08] text-white'
                                                    : 'bg-rose-300/[0.08] text-white'),
                                            )}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="flex min-w-[140px] items-center gap-2">
                                                    <div className={cn(
                                                        'h-7 w-7 overflow-hidden border bg-black/30 shadow-[0_0_10px_rgba(0,0,0,0.35)]',
                                                        isBlue ? 'border-blue-300/45' : 'border-rose-300/45',
                                                    )}>
                                                        {agent?.displayIcon ? (
                                                            <img src={agent.displayIcon} loading="lazy" className="h-full w-full object-cover" alt="" />
                                                        ) : null}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-black">{entry.gameName}</div>
                                                        <div className="text-[9px] text-slate-500">#{entry.tagLine}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-center font-black text-white">{roundStats.kills}</td>
                                            <td className="px-2 py-2 text-center text-slate-400">{roundStats.deaths}</td>
                                            <td className="px-2 py-2 text-center text-slate-400">{roundStats.assists}</td>
                                            <td className="px-2 py-2 text-right font-mono text-slate-200">{roundStats.damage}</td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-400">{roundStats.spent.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-4">
                <div className="overflow-hidden border border-white/5 bg-[#07111a] shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between border-b border-white/5 bg-[linear-gradient(90deg,#2a4054,#172636)] px-4 py-2.5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-100/85">Round Control</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {debugRounds.length} rounds
                        </p>
                    </div>
                    <div className="scroller-hide flex gap-1 overflow-x-auto bg-[linear-gradient(180deg,#0c1824,#070c12)] p-2">
                        {debugRounds.map(({ summary }) => {
                            const result = resolveRoundResultCode(summary);
                            const meta = getRoundResultMeta(result);
                            const isBlueWin = summary.winningTeam === 'Blue';
                            const isActive = selectedSummary.round === summary.round;
                            const roundSide = getRoundSideInfo(summary.round);

                            return (
                                <button
                                    key={summary.round}
                                    type="button"
                                    onClick={() => setSelectedRoundNumber(summary.round)}
                                    className={cn(
                                        'group relative min-w-[82px] overflow-hidden border px-2 py-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30',
                                        isBlueWin
                                            ? 'border-blue-300/20 bg-blue-950/45 text-blue-100 hover:border-blue-200/45'
                                            : 'border-rose-300/20 bg-rose-950/45 text-rose-100 hover:border-rose-200/45',
                                        isActive && (isBlueWin
                                            ? 'border-blue-100 bg-blue-500/20 shadow-[0_0_22px_rgba(96,165,250,0.28)]'
                                            : 'border-rose-100 bg-rose-500/20 shadow-[0_0_22px_rgba(251,113,133,0.28)]'),
                                    )}
                                >
                                    <span className={cn(
                                        'absolute inset-x-0 top-0 h-0.5',
                                        isBlueWin ? 'bg-blue-300' : 'bg-rose-300',
                                    )} />
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] font-black">R{summary.round}</span>
                                        <span className={cn('font-mono text-[9px] font-black tracking-wider', meta.tone)}>
                                            {meta.short}
                                        </span>
                                    </div>
                                    <div className="mt-1 truncate text-[8px] font-black uppercase tracking-wide text-white/45">
                                        {roundSide.attackingTeam} attack
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <div className={cn('relative overflow-hidden bg-gradient-to-br p-5 shadow-[0_18px_55px_rgba(0,0,0,0.3)]', winningSurface)}>
                        <div className={cn(
                            'absolute inset-y-0 left-0 w-1',
                            isBlueWinner ? 'bg-blue-300' : 'bg-rose-300',
                        )} />
                        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/[0.04] blur-2xl" />
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-300/70">Round {selectedSummary.round}</p>
                                <div className="mt-2 flex items-center gap-3">
                                    <div className={cn(
                                        'flex h-12 w-12 items-center justify-center border font-mono text-[11px] font-black tracking-wider',
                                        isBlueWinner
                                            ? 'border-blue-200/50 bg-blue-200/10 text-blue-100'
                                            : 'border-rose-200/50 bg-rose-200/10 text-rose-100',
                                    )}>
                                        {selectedMeta.short}
                                    </div>
                                    <div>
                                        <div className={cn('text-lg font-black', winningTone)}>Team {winningTeam || 'Unknown'} won</div>
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            {selectedMeta.label}
                                            {selectedSummary.plantSite ? ` · Site ${selectedSummary.plantSite}` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                            <div className="border border-white/5 bg-black/20 p-3">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Attack</div>
                                <div className="mt-1 font-black text-slate-100">Team {sideInfo.attackingTeam}</div>
                            </div>
                            <div className="border border-white/5 bg-black/20 p-3">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Defense</div>
                                <div className="mt-1 font-black text-slate-100">Team {sideInfo.defendingTeam}</div>
                            </div>
                            <div className="border border-white/5 bg-black/20 p-3">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Kills</div>
                                <div className="mt-1 font-mono text-lg font-black text-white">{allRoundKills.length}</div>
                            </div>
                            <div className="border border-white/5 bg-black/20 p-3">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Spike</div>
                                <div className="mt-1 font-black text-white">{selectedSummary.plantSite ? `Site ${selectedSummary.plantSite}` : '-'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {renderTeamRoundTable('Blue')}
                        {renderTeamRoundTable('Red')}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Card className={cn(
            'group relative overflow-hidden rounded-none border border-white/10 border-l-4 bg-[#070d13] shadow-[0_22px_80px_rgba(0,0,0,0.45)] transition-all duration-500 hover:border-white/20',
            resultTone.rail,
            resultTone.glow,
        )}>
            <div
                className="relative z-10 grid cursor-pointer gap-4 overflow-hidden border-b border-white/10 bg-[linear-gradient(90deg,#101a24_0%,#0c151e_48%,#091017_100%)] px-5 py-4 transition-colors hover:bg-[#101b26] md:grid-cols-[minmax(260px,1fr)_auto_auto]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {mapData?.listViewIcon ? (
                    <div
                        className="pointer-events-none absolute inset-y-0 left-[34%] right-0 opacity-35 transition-all duration-500 group-hover:opacity-50"
                        style={{
                            backgroundImage: `linear-gradient(to right, rgba(7, 13, 19, 0.98) 0%, rgba(7, 13, 19, 0.62) 38%, rgba(7, 13, 19, 0.86) 100%), url(${mapData.listViewIcon})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'contrast(1.18) saturate(1.18) brightness(0.78)',
                        }}
                    />
                ) : null}

                <div className="relative z-10 flex min-w-0 items-center gap-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden border border-white/10 bg-black/40">
                        {agentData?.displayIcon ? (
                            <img
                                src={agentData.displayIcon}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                alt=""
                            />
                        ) : null}
                        <div className={cn('absolute bottom-0 right-0 border-l border-t p-1.5', resultTone.badge)}>
                            {isWin ? <Trophy className="h-3.5 w-3.5" /> : <Skull className="h-3.5 w-3.5" />}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                            <MapIcon className={cn('h-4 w-4 flex-shrink-0', resultTone.text)} />
                            <div className="truncate text-lg font-black leading-none text-white">
                                {mapData?.displayName || 'Loading…'}
                            </div>
                            <span className={cn('hidden border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider sm:inline-flex', resultTone.badge)}>
                                {isWin ? 'Win' : 'Loss'}
                            </span>
                        </div>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-wider text-slate-300/65">
                            <span>{matchData.matchInfo.queueId || 'Custom'}</span>
                            {gameModeLabel ? <span>{gameModeLabel}</span> : null}
                            {rankedLabel ? <span>Ranked</span> : null}
                            <span>{Math.round((matchData.matchInfo.gameLengthMillis ?? 0) / 60000)}m</span>
                        </div>
                        {parsedInfo?.region ? (
                            <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                Region {parsedInfo.region}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 items-center gap-4 md:grid-cols-[minmax(130px,auto)_minmax(110px,auto)]">
                    <div className="text-left md:text-right">
                        <div className="text-2xl font-black leading-none tracking-tight text-white drop-shadow-lg">
                            {player.stats.kills}
                            <span className="mx-1.5 text-slate-600">/</span>
                            {player.stats.deaths}
                            <span className="mx-1.5 text-slate-600">/</span>
                            {player.stats.assists}
                        </div>
                        <div className="mt-1 flex justify-start gap-3 md:justify-end">
                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                KD{' '}
                                <span className="text-slate-100">
                                    {(player.stats.kills / Math.max(1, player.stats.deaths)).toFixed(2)}
                                </span>
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                ACS <span className="text-slate-100">{enrichedTarget?.acs ?? '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-left md:text-center">
                        <div className="flex items-baseline gap-2 text-2xl font-black">
                            <span className={resultTone.text}>
                                {targetRounds}
                            </span>
                            <span className="text-slate-600">/</span>
                            <span className="text-[#ff4d6d]">{opponentRounds}</span>
                        </div>
                        <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Match Score
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center justify-between gap-4 md:justify-end">
                    <div className="grid grid-cols-2 gap-2 text-right">
                        <div className="border border-white/10 bg-black/20 px-3 py-2">
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">KAST</div>
                            <div className="font-mono text-sm font-black text-slate-100">{targetKAST}%</div>
                        </div>
                        <div className="border border-white/10 bg-black/20 px-3 py-2">
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">FK</div>
                            <div className={cn('font-mono text-sm font-black', resultTone.text)}>
                                {enrichedTarget?.firstBloods ?? analytics?.playerStatsMap[targetPuuid]?.fb ?? 0}
                            </div>
                        </div>
                    </div>
                    <div className="text-slate-500 transition-colors group-hover:text-white/70">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </div>
            </div>

            {isExpanded ? (
                <div className="animate-in slide-in-from-top-4 bg-[#0b141d] duration-500">
                    <div className="grid border-b border-rose-500/40 bg-[#263b4d] text-center sm:grid-cols-5">
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
                                className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-[11px] font-black transition-all ${
                                    activeTab === tab.id
                                        ? 'border-rose-400 bg-[#0f1c28] text-white'
                                        : 'border-transparent text-slate-200/75 hover:bg-[#203141] hover:text-white'
                                }`}
                            >
                                <tab.icon className="h-3.5 w-3.5 text-slate-300/80" /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="border-b border-white/5 bg-[#0f1c28] px-5 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <span className="mr-2 text-xs font-bold text-teal-300">Team {teamId}</span>
                            {matchData.players
                                .slice()
                                .sort((a, b) => (a.teamId === teamId ? -1 : 1) - (b.teamId === teamId ? -1 : 1))
                                .map((entry, index) => {
                                    const agent = entry.characterId ? allAgents[entry.characterId.toLowerCase()] : undefined;
                                    const isFriendly = entry.teamId === teamId;

                                    return (
                                        <React.Fragment key={entry.puuid}>
                                            {index === 5 ? (
                                                <span className="mx-1 bg-[#203141] px-2 py-1 text-[10px] font-black uppercase text-slate-300">
                                                    vs
                                                </span>
                                            ) : null}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPuuid(entry.puuid)}
                                                title={`${entry.gameName}#${entry.tagLine}`}
                                                className={cn(
                                                    'relative h-9 w-9 overflow-hidden border bg-[#0b141d] transition-all duration-200',
                                                    'hover:-translate-y-0.5 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-white/40',
                                                    isFriendly ? 'border-teal-400/70' : 'border-rose-400/70',
                                                    selectedPlayer.puuid === entry.puuid && (isFriendly
                                                        ? 'border-teal-200 brightness-125 shadow-[0_0_16px_rgba(45,212,191,0.45)]'
                                                        : 'border-rose-200 brightness-125 shadow-[0_0_16px_rgba(251,113,133,0.45)]'),
                                                    selectedPlayer.puuid !== entry.puuid && 'opacity-75',
                                                )}
                                            >
                                                {agent?.displayIcon ? (
                                                    <img src={agent.displayIcon} loading="lazy" className="h-full w-full object-cover" alt="" />
                                                ) : null}
                                                {selectedPlayer.puuid === entry.puuid ? (
                                                    <span className={cn(
                                                        'absolute inset-x-1 bottom-0 h-0.5',
                                                        isFriendly ? 'bg-teal-200' : 'bg-rose-200',
                                                    )} />
                                                ) : null}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            <span className="ml-2 text-xs font-bold text-rose-300">
                                Team {matchData.teams.find((entry) => entry.teamId !== teamId)?.teamId}
                            </span>
                        </div>
                    </div>

                    <div className="bg-[#0b141d] p-4 lg:p-5">
                        <div className="mb-4 grid gap-4 bg-[#092f31] p-4 md:grid-cols-[120px_minmax(0,1fr)_auto]">
                            <div className="hidden h-28 items-end justify-center md:flex">
                                {selectedAgent?.displayIcon ? (
                                    <img src={selectedAgent.displayIcon} loading="lazy" className="max-h-28 object-contain opacity-85 drop-shadow-[0_0_20px_rgba(45,212,191,0.12)]" alt="" />
                                ) : null}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-2xl font-black text-white">{selectedPlayer.gameName}</h3>
                                    <span className="bg-white/10 px-2 py-1 text-xs font-black text-slate-200">#{selectedPlayer.tagLine}</span>
                                    {selectedRank?.smallIcon || selectedRank?.largeIcon ? (
                                        <img src={selectedRank.smallIcon || selectedRank.largeIcon} loading="lazy" className="h-6 w-6 object-contain" alt="" />
                                    ) : null}
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-4 text-sm sm:grid-cols-6">
                                    {[
                                        ['K/D/A', `${selectedPlayer.stats.kills} / ${selectedPlayer.stats.deaths} / ${selectedPlayer.stats.assists}`],
                                        ['K/D', selectedKd],
                                        ['ADR', selectedAdr],
                                        ['ACS', selectedAcs],
                                        ['HS%', `${formatStat(selectedHsPct)}%`],
                                        ['KAST', `${selectedKast}%`],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <div className="text-[10px] font-black uppercase text-slate-300/65">{label}</div>
                                            <div className="text-lg font-black text-slate-100">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right text-xs font-black uppercase tracking-wider text-slate-300/70">
                                {formatRankName(selectedRank, selectedPlayer.competitiveTier)}
                            </div>
                        </div>

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
                                {renderPremiumRounds()}
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-[#050a0f] px-5 py-3">
                <div className="flex min-w-0 items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                    <span className={cn('h-1.5 w-1.5 rounded-full shadow-[0_0_12px_currentColor]', resultTone.text)} />
                    <span className="truncate">Enriched match data</span>
                    <span className="hidden text-slate-700 sm:inline">/</span>
                    <span className="hidden font-mono text-slate-600 sm:inline">{matchData.matchInfo.matchId?.slice(0, 12)}…</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <span>{roundTimeline.length || roundResults.length} rounds</span>
                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                    <span>{weaponSummaries.length} weapons</span>
                </div>
            </div>
        </Card>
    );
};

export default MatchHistoryCard;
