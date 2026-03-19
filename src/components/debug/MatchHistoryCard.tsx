import React, { useEffect, useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    User, Trophy, Skull, Target, Map as MapIcon, ChevronDown, ChevronUp,
    Swords, Clock, Calendar, Zap, TrendingUp, List, BarChart3,
    ArrowUpRight, ArrowDownRight, Info, Crosshair
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

// External Valorant/Riot API match data — deeply nested, schema varies by game version.
// Using `any` intentionally as full typing would require 200+ interface definitions
// for a debug-only component consuming third-party API responses.
interface MatchHistoryCardProps {
    matchData: Record<string, unknown>;
    targetPuuid: string;
}

const MatchHistoryCard: React.FC<MatchHistoryCardProps> = ({ matchData, targetPuuid }) => {
    // Riot API agent/map/weapon metadata — variable structure per game version
    const [agentData, setAgentData] = useState<Record<string, unknown> | null>(null);
    const [mapData, setMapData] = useState<Record<string, unknown> | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'scoreboard' | 'economy' | 'rounds'>('scoreboard');
    const [selectedRound, setSelectedRound] = useState(0);
    const [allAgents, setAllAgents] = useState<Record<string, Record<string, unknown>>>({});
    const [weapons, setWeapons] = useState<Record<string, Record<string, unknown>>>({});

    // Parse Core Player Info
    const player = matchData.players.find((p: any) => p.puuid === targetPuuid);
    const teamId = player?.teamId;
    const isWin = matchData.teams.find((t: any) => t.teamId === teamId)?.won;

    // Advanced Stats & Analytics Engine
    const analytics = useMemo(() => {
        if (!matchData.roundResults || !player) return null;

        const rounds = matchData.roundResults;
        const players = matchData.players;

        // 1. Economy Analytics
        const economyData = rounds.map((round: any, index: number) => {
            let blueBank = 0;
            let redBank = 0;
            round.playerStats.forEach((ps: any) => {
                const p = players.find((pl: any) => pl.puuid === ps.puuid);
                if (p.teamId === "Blue") blueBank += ps.economy.spent;
                else redBank += ps.economy.spent;
            });

            return {
                round: index + 1,
                blueBank,
                redBank,
                diff: blueBank - redBank
            };
        });

        // Check if API already provides advanced stats (e.g. via HenrikDev/Unoffical API or detailed match v1)
        const hasApiStats = players.some((p: any) => p.stats?.firstBloods !== undefined);

        // 2. Performance Metrics (KAST, FB, FD)
        const playerStatsMap: Record<string, any> = {};
        players.forEach((p: any) => {
            playerStatsMap[p.puuid] = {
                kastCount: 0,
                // Use API stats if available, otherwise 0 (will calc below)
                fb: hasApiStats ? (p.stats?.firstBloods || 0) : 0,
                fd: hasApiStats ? (p.stats?.firstDeaths || 0) : 0,
                multiKills: { 2: 0, 3: 0, 4: 0, 5: 0 },
                hits: { head: 0, body: 0, leg: 0 }
            };
        });

        rounds.forEach((round: any) => {
            // Robust First Blood Logic: Gather ALL kills in the round, sort by time.
            // Only calculate if API doesn't provide it.
            if (!hasApiStats) {
                const allKills = round.playerStats.flatMap((ps: any) =>
                    ps.kills.map((k: any) => ({
                        ...k,
                        killer: ps.puuid,
                        killerTeam: players.find((p: any) => p.puuid === ps.puuid)?.teamId
                    }))
                ).filter((k: any) => k.killer !== k.victim); // Ignore self-kills

                allKills.sort((a: any, b: any) => a.timeSinceRoundStartMillis - b.timeSinceRoundStartMillis);

                const firstBlood = allKills[0];
                if (firstBlood) {
                    playerStatsMap[firstBlood.killer].fb++;
                    playerStatsMap[firstBlood.victim].fd++;
                }
            }

            // Correctly track hits for stats (HS%) - moved outside FB logic block
            round.playerStats.forEach((ps: any) => {
                ps.damage.forEach((d: any) => {
                    playerStatsMap[ps.puuid].hits.head += d.headshots;
                    playerStatsMap[ps.puuid].hits.body += d.bodyshots;
                    playerStatsMap[ps.puuid].hits.leg += d.legshots;
                });
            });

            // KAST & Multi-Kill Logic
            players.forEach((p: any) => {
                const ps = round.playerStats.find((s: any) => s.puuid === p.puuid);
                const killedSomeone = ps?.kills.length > 0;
                // ... (rest of the KAST logic remains same)
                const gotAssist = matchData.players.some((other: any) =>
                    other.puuid !== p.puuid &&
                    round.playerStats.find((os: any) => os.puuid === other.puuid)?.kills.some((k: any) =>
                        k.assistants.includes(p.puuid)
                    )
                );
                const survived = !round.playerStats.some((os: any) => os.kills.some((k: any) => k.victim === p.puuid));

                let traded = false;
                const death = round.playerStats.flatMap((os: any) => os.kills).find((k: any) => k.victim === p.puuid);
                if (death) {
                    const victimTeammates = players.filter((t: any) => t.teamId === p.teamId && t.puuid !== p.puuid);
                    traded = round.playerStats.some((os: any) =>
                        victimTeammates.some(vt => vt.puuid === os.puuid) &&
                        os.kills.some((k: any) =>
                            k.victim === death.killer &&
                            Math.abs(k.timeSinceRoundStartMillis - death.timeSinceRoundStartMillis) < 4000
                        )
                    );
                }

                if (killedSomeone || gotAssist || survived || traded) {
                    playerStatsMap[p.puuid].kastCount++;
                }

                if (ps?.kills.length >= 2) {
                    const count = Math.min(ps.kills.length, 5) as 2 | 3 | 4 | 5;
                    playerStatsMap[p.puuid].multiKills[count]++;
                }
            });
        });

        return { economyData, playerStatsMap, roundCount: rounds.length };
    }, [matchData]);

    const targetKAST = analytics ? Math.round((analytics.playerStatsMap[targetPuuid].kastCount / analytics.roundCount) * 100) : 0;
    const targetHS = analytics ? (() => {
        const hits = analytics.playerStatsMap[targetPuuid].hits;
        const total = hits.head + hits.body + hits.leg;
        return total > 0 ? Math.round((hits.head / total) * 100) : 0;
    })() : 0;

    // Valorant API assets
    useEffect(() => {
        if (player?.characterId) {
            fetch(`https://valorant-api.com/v1/agents/${player.characterId}`)
                .then(res => res.json())
                .then(data => setAgentData(data.data));
        }

        fetch(`https://valorant-api.com/v1/agents?isPlayableCharacter=true`)
            .then(res => res.json())
            .then(data => {
                const map: Record<string, any> = {};
                data.data.forEach((a: any) => { map[a.uuid.toLowerCase()] = a; });
                setAllAgents(map);
            });

        fetch(`https://valorant-api.com/v1/weapons`)
            .then(res => res.json())
            .then(data => {
                const map: Record<string, any> = {};
                data.data.forEach((w: any) => { map[w.uuid.toLowerCase()] = w; });
                setWeapons(map);
            });

        const mapUri = matchData.matchInfo.mapId;
        fetch(`https://valorant-api.com/v1/maps`)
            .then(res => res.json())
            .then(data => {
                const foundMap = data.data.find((m: any) => m.mapUrl === mapUri);
                setMapData(foundMap);
            });
    }, [player?.characterId, matchData.matchInfo.mapId]);

    if (!player) {
        return (
            <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-4 text-center">
                <p className="text-zinc-400 text-sm">Player data not found in this match.</p>
            </div>
        );
    }

    // Coordinate Mapping logic
    const mapToPixels = (x: number, y: number) => {
        if (!mapData) return { x: 0, y: 0 };
        const { xMultiplier, yMultiplier, xScalarToAdd, yScalarToAdd } = mapData;
        return {
            x: ((y * xMultiplier) + xScalarToAdd) * 100, // Normalized to 100%
            y: ((x * yMultiplier) + yScalarToAdd) * 100
        };
    };

    const renderScoreboardTable = (players: any[], teamName: string, color: string) => (
        <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-separate border-spacing-y-1">
                <thead>
                    <tr className="text-zinc-500 uppercase font-black tracking-tighter">
                        <th className="pb-2 pl-4">Player</th>
                        <th className="pb-2 text-center">ACS</th>
                        <th className="pb-2 text-center">K</th>
                        <th className="pb-2 text-center">D</th>
                        <th className="pb-2 text-center">A</th>
                        <th className="pb-2 text-center">+/-</th>
                        <th className="pb-2 text-center">K/D</th>
                        <th className="pb-2 text-center">HS%</th>
                        <th className="pb-2 text-center">ADR</th>
                        <th className="pb-2 text-center">KAST</th>
                        <th className="pb-2 text-center">FK</th>
                        <th className="pb-2 text-center">FD</th>
                    </tr>
                </thead>
                <tbody>
                    {players.sort((a, b) => b.stats.score - a.stats.score).map((p) => {
                        const agent = allAgents[p.characterId.toLowerCase()];
                        const pAnalytics = analytics?.playerStatsMap[p.puuid];

                        const hits = pAnalytics?.hits || { head: 0, body: 0, leg: 0 };
                        const totalHits = hits.head + hits.body + hits.leg;
                        const hsPerc = totalHits > 0 ? Math.round((hits.head / totalHits) * 100) : 0;

                        const killDiff = p.stats.kills - p.stats.deaths;
                        const kdRatio = (p.stats.kills / Math.max(1, p.stats.deaths)).toFixed(2);
                        const diffColor = killDiff > 0 ? 'text-emerald-400' : (killDiff < 0 ? 'text-rose-400' : 'text-zinc-500');
                        const kdColor = Number(kdRatio) >= 1 ? 'text-emerald-400' : 'text-rose-400';

                        return (
                            <tr key={p.puuid} className={`group/row ${p.puuid === targetPuuid ? 'bg-zinc-800/80 ring-1 ring-white/10 shadow-lg' : 'hover:bg-zinc-900/40'} transition-all duration-300`}>
                                <td className="py-2 pl-4 rounded-l-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-black/40 border border-white/5 overflow-hidden">
                                            {agent && <img src={agent.displayIcon} className="w-full h-full" />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-zinc-200 flex items-center gap-1">
                                                {p.gameName} <span className="text-zinc-500 font-normal">#{p.tagLine}</span>
                                            </div>
                                            <div className="text-[9px] text-zinc-600 flex items-center gap-1 mt-0.5">
                                                <img src={`https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a3b05d1c/${p.competitiveTier}/smallicon.png`} className="w-3 h-3 opacity-80" />
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-center font-bold text-zinc-300">{Math.round(p.stats.score / analytics!.roundCount)}</td>
                                <td className="text-center font-bold text-white">{p.stats.kills}</td>
                                <td className="text-center text-zinc-400">{p.stats.deaths}</td>
                                <td className="text-center text-zinc-400">{p.stats.assists}</td>
                                <td className={`text-center font-bold ${diffColor}`}>{killDiff > 0 ? `+${killDiff}` : killDiff}</td>
                                <td className={`text-center font-bold ${kdColor}`}>{kdRatio}</td>
                                <td className="text-center font-mono text-white/90">{hsPerc}%</td>
                                <td className="text-center text-zinc-300">{Math.round(p.stats.score / analytics!.roundCount)}</td>
                                <td className="text-center text-zinc-400 font-mono italic">{Math.round((pAnalytics?.kastCount || 0) / analytics!.roundCount * 100)}%</td>
                                <td className="text-center text-emerald-500 font-bold">{pAnalytics?.fb || 0}</td>
                                <td className="text-center text-rose-500 font-bold">{pAnalytics?.fd || 0}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );

    // const roundEvents = matchData.roundResults[selectedRound]?.playerStats.flatMap((ps: any) => ps.kills.map((k: any) => ({ ...k, killer: ps.puuid })))
    //     .sort((a: any, b: any) => a.timeSinceRoundStartMillis - b.timeSinceRoundStartMillis) || [];

    return (
        <Card className={`relative overflow-hidden bg-zinc-950/60 border border-zinc-900 border-l-4 ${isWin ? 'border-l-emerald-600' : 'border-l-rose-600'} transition-all duration-500 backdrop-blur-xl shadow-2xl group`}>
            {/* Header / Summary Card */}
            <div
                className="flex items-center p-5 gap-6 cursor-pointer hover:bg-white/5 transition-colors relative z-10"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="relative w-16 h-16 flex-shrink-0">
                    <img src={agentData?.displayIcon} className="w-full h-full object-cover rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl group-hover:scale-110 transition-transform duration-500" />
                    <div className={`absolute -bottom-2 -right-2 rounded-full p-1.5 border ${isWin ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'}`}>
                        {isWin ? <Trophy className="w-3 h-3 text-white" /> : <Skull className="w-3 h-3 text-white" />}
                    </div>
                </div>

                <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                        <div className="text-sm font-black text-white flex items-center gap-2">
                            <MapIcon className="w-4 h-4 text-rose-500" /> {mapData?.displayName || "Loading..."}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">
                            {matchData.matchInfo.queueId || "Custom"} • {Math.round(matchData.matchInfo.gameLengthMillis / 60000)}M
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-2xl font-black text-white tracking-tighter leading-none drop-shadow-lg">
                            {player.stats.kills}<span className="text-zinc-500 mx-1">/</span>{player.stats.deaths}<span className="text-zinc-500 mx-1">/</span>{player.stats.assists}
                        </div>
                        <div className="flex items-center justify-center gap-3 mt-1">
                            <div className="text-[10px] text-zinc-400 font-black uppercase drop-shadow-md">
                                KD <span className="text-white">{(player.stats.kills / Math.max(1, player.stats.deaths)).toFixed(2)}</span>
                            </div>
                            <div className="w-1 h-1 bg-zinc-600 rounded-full" />
                            <div className="text-[10px] text-zinc-400 font-black uppercase drop-shadow-md">
                                KDA {((player.stats.kills + player.stats.assists) / Math.max(1, player.stats.deaths)).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:block text-center">
                        <div className="text-2xl font-black flex justify-center gap-3">
                            <span className={isWin ? "text-emerald-500" : "text-rose-500"}>
                                {matchData.teams.find((t: any) => t.teamId === teamId)?.roundsWon}
                            </span>
                            <span className="text-zinc-500">/</span>
                            <span className={!isWin ? "text-emerald-500" : "text-rose-500"}>
                                {matchData.teams.find((t: any) => t.teamId !== teamId)?.roundsWon}
                            </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-black uppercase mt-1 drop-shadow-md">Match Score</div>
                    </div>

                    <div className="flex flex-col items-end pr-4">
                        <div className="flex gap-4 text-right">
                            <div>
                                <div className="text-[9px] text-zinc-400 font-black drop-shadow-md">KAST</div>
                                <div className="text-xs font-mono text-zinc-300 drop-shadow-md">{targetKAST}%</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-zinc-400 font-black drop-shadow-md">FB</div>
                                <div className="text-xs font-mono text-emerald-400 drop-shadow-md">{analytics?.playerStatsMap[targetPuuid].fb || 0}</div>
                            </div>
                        </div>
                        <div className="mt-2 text-zinc-700 transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 animate-bounce" />}
                        </div>
                    </div>
                </div>

                {mapData?.listViewIcon && (
                    <div
                        className="absolute right-0 top-0 w-2/3 h-full opacity-40 pointer-events-none transition-all duration-500 group-hover:opacity-60"
                        style={{
                            backgroundImage: `linear-gradient(to left, rgba(9, 9, 11, 1) 20%, rgba(9, 9, 11, 0.6) 60%, rgba(9, 9, 11, 0.2)), url(${mapData.listViewIcon})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'right center',
                            filter: 'contrast(1.1) brightness(0.7)'
                        }}
                    />
                )}
            </div>

            {/* Expanded Detailed View */}
            {isExpanded && (
                <div className="bg-black/60 border-t border-white/10 animate-in slide-in-from-top-4 duration-500 backdrop-blur-3xl">

                    {/* Inner Tabs */}
                    <div className="flex items-center gap-8 px-8 py-4 border-b border-white/5 overflow-x-auto scroller-hide">
                        {[
                            { id: 'scoreboard', label: 'Scoreboard', icon: List },
                            { id: 'economy', label: 'Economy', icon: BarChart3 },
                            { id: 'rounds', label: 'Rounds', icon: Zap }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${activeTab === tab.id ? 'text-rose-500 border-rose-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                            >
                                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'scoreboard' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div>
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2 px-2">
                                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" /> Blue Team
                                    </div>
                                    {renderScoreboardTable(matchData.players.filter((p: any) => p.teamId === "Blue"), "Blue", "blue")}
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2 px-2">
                                        <div className="w-1.5 h-4 bg-rose-500 rounded-full" /> Red Team
                                    </div>
                                    {renderScoreboardTable(matchData.players.filter((p: any) => p.teamId === "Red"), "Red", "rose")}
                                </div>
                            </div>
                        )}

                        {activeTab === 'economy' && (
                            <div className="h-[300px] w-full pt-4 animate-in zoom-in-95 duration-500">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics?.economyData}>
                                        <defs>
                                            <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                        <XAxis dataKey="round" stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                                            itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="blueBank" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBlue)" name="Blue Team Economy" />
                                        <Area type="monotone" dataKey="redBank" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorRed)" name="Red Team Economy" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {activeTab === 'rounds' && (
                            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] px-1">Round Timeline</div>
                                    <div className="flex flex-wrap gap-2">
                                        {matchData.roundResults.map((r: any, i: number) => {
                                            const winningTeam = r.winningTeam;
                                            const isBlueWin = winningTeam === 'Blue';
                                            const resultColor = isBlueWin ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400';

                                            // Determine win type icon
                                            let WinIcon = Trophy;
                                            if (r.roundResultCode === "Elimination") WinIcon = Skull;
                                            if (r.roundResultCode === "Detonate") WinIcon = Target;
                                            if (r.roundResultCode === "Defuse") WinIcon = Zap;
                                            if (r.roundResultCode === "TimeOut") WinIcon = Clock;

                                            return (
                                                <div key={i} className={`h-12 w-10 rounded-md border ${resultColor} flex flex-col items-center justify-center gap-1 transition-all hover:scale-110`}>
                                                    <div className="text-[8px] font-bold opacity-60">{i + 1}</div>
                                                    <WinIcon className="w-3.5 h-3.5" />
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex items-center gap-6 mt-2 px-2">
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Blue Team Won
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-rose-400 uppercase tracking-wider">
                                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Red Team Won
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer Footnote */}
            <div className="mt-4 pt-4 px-8 pb-6 border-t border-white/5 flex items-center justify-between opacity-30">
                <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                    <Zap className="w-3 h-3 text-rose-500" /> PRO-TIER ANALYTICS • MATCH ID: {matchData.matchInfo.matchId.slice(0, 12)}...
                </div>
                <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-[0.2em]">
                    Server Cluster: {matchData.matchInfo.gameServerAddress || "Asia Pulse"}
                </div>
            </div>
        </Card>
    );
};

export default MatchHistoryCard;
