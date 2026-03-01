import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, ChevronDown, ChevronUp, Trophy, Skull, Map as MapIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const FaceitTest = () => {
    const [nickname, setNickname] = useState("");
    const [playerData, setPlayerData] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [matchStats, setMatchStats] = useState<Record<string, any>>({});
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
    const [loadingPlayer, setLoadingPlayer] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingStats, setLoadingStats] = useState<string | null>(null);
    const { toast } = useToast();

    const callProxy = async (endpoint: string) => {
        const { data, error } = await supabase.functions.invoke('faceit-match-proxy', {
            body: { endpoint },
        });
        if (error) throw new Error(error.message || 'Proxy error');
        if (data?.message && !data?.player_id && !data?.items) throw new Error(data.message);
        return data;
    };

    const fetchPlayer = async () => {
        if (!nickname.trim()) return;
        setLoadingPlayer(true);
        setPlayerData(null);
        setMatches([]);
        setMatchStats({});
        setExpandedMatch(null);
        try {
            const data = await callProxy(`/players?nickname=${encodeURIComponent(nickname.trim())}`);
            if (!data?.player_id) {
                toast({ title: "Player not found", description: `No Faceit account for "${nickname}"`, variant: "destructive" });
                return;
            }
            setPlayerData(data);
            await fetchHistory(data.player_id);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingPlayer(false);
        }
    };

    const fetchHistory = async (pid: string) => {
        setLoadingHistory(true);
        setMatches([]);
        try {
            const data = await callProxy(`/players/${pid}/history?game=cs2&limit=20`);
            const items: any[] = data?.items || [];
            setMatches(items);
            if (items.length === 0) {
                toast({ title: "No CS2 matches found", description: "No recent CS2 match history.", variant: "default" });
            }
        } catch (err: any) {
            toast({ title: "History error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingHistory(false);
        }
    };

    const toggleStats = async (matchId: string) => {
        if (expandedMatch === matchId) { setExpandedMatch(null); return; }
        setExpandedMatch(matchId);
        if (matchStats[matchId]) return;
        setLoadingStats(matchId);
        try {
            const data = await callProxy(`/matches/${matchId}/stats`);
            setMatchStats(prev => ({ ...prev, [matchId]: data }));
        } catch (err: any) {
            toast({ title: "Stats error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingStats(null);
        }
    };

    // Which faction is the searched player on?
    const getPlayerFaction = (match: any): 'faction1' | 'faction2' | null => {
        if (!playerData?.player_id) return null;
        const r1: any[] = match.teams?.faction1?.roster || [];
        const r2: any[] = match.teams?.faction2?.roster || [];
        if (r1.some((r: any) => r.player_id === playerData.player_id)) return 'faction1';
        if (r2.some((r: any) => r.player_id === playerData.player_id)) return 'faction2';
        return null;
    };

    const cs2 = playerData?.games?.cs2;
    const loading = loadingPlayer || loadingHistory;

    return (
        <div className="container mx-auto py-10 space-y-6 max-w-5xl pb-40">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-white italic">
                    FACEIT<span className="text-orange-500">TRACKER</span>{' '}
                    <span className="text-zinc-600 text-2xl not-italic font-normal">DEBUG</span>
                </h1>
                <p className="text-zinc-500 text-sm">CS2 match history via Faceit Data API proxy</p>
            </div>

            {/* Search */}
            <div className="flex gap-3">
                <Input
                    placeholder="Faceit nickname (e.g. s1mple)"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchPlayer()}
                    className="bg-zinc-950 border-zinc-800 text-white h-11"
                />
                <Button
                    onClick={fetchPlayer}
                    disabled={loading || !nickname.trim()}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 h-11 shrink-0"
                >
                    {loadingPlayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
            </div>

            {/* Player card */}
            {playerData && cs2 && (
                <div className="bg-zinc-900/60 border border-orange-500/20 rounded-xl px-5 py-4 flex items-center gap-4">
                    <img
                        src={playerData.avatar || ''}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover border-2 border-orange-500/30 bg-zinc-800 shrink-0"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl font-black text-white">{playerData.nickname}</span>
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs font-bold">
                                Level {cs2.skill_level}
                            </Badge>
                            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                                {cs2.region}
                            </Badge>
                            {playerData.country && (
                                <span className="text-xs text-zinc-500 uppercase font-mono">{playerData.country}</span>
                            )}
                        </div>
                        <div className="text-sm text-zinc-400 mt-0.5">
                            <span className="text-orange-400 font-bold">{cs2.faceit_elo}</span>
                            <span className="text-zinc-600 mx-1">ELO</span>
                            <span className="text-zinc-600 mx-2">·</span>
                            <span className="font-mono text-zinc-500 text-xs">{playerData.player_id}</span>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchHistory(playerData.player_id)}
                        disabled={loadingHistory}
                        className="border-zinc-700 text-zinc-300 hover:text-white shrink-0"
                    >
                        {loadingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Refresh'}
                    </Button>
                </div>
            )}

            {/* Match history */}
            {loadingHistory && matches.length === 0 ? (
                <div className="space-y-3">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Fetching CS2 history...</div>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full bg-zinc-900/50 rounded-xl" />
                    ))}
                </div>
            ) : matches.length > 0 ? (
                <div className="space-y-3">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-orange-500" />
                        CS2 Match History ({matches.length})
                    </div>

                    {matches.map((m: any) => {
                        const f1 = m.teams?.faction1;
                        const f2 = m.teams?.faction2;
                        const score1 = m.results?.score?.faction1 ?? '?';
                        const score2 = m.results?.score?.faction2 ?? '?';
                        const winner = m.results?.winner;
                        const playerFaction = getPlayerFaction(m);
                        const playerWon = playerFaction !== null && winner === playerFaction;
                        const isExpanded = expandedMatch === m.match_id;
                        const stats = matchStats[m.match_id];
                        const mapName = stats?.rounds?.[0]?.round_stats?.Map;
                        const date = m.finished_at
                            ? new Date(m.finished_at * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : '';

                        return (
                            <div
                                key={m.match_id}
                                className={`relative overflow-hidden bg-zinc-900/70 border rounded-xl border-l-4 transition-all duration-200 ${
                                    playerFaction
                                        ? playerWon
                                            ? 'border-zinc-800 border-l-emerald-500'
                                            : 'border-zinc-800 border-l-rose-600'
                                        : 'border-zinc-800 border-l-zinc-700'
                                }`}
                            >
                                {/* Collapsed row — click to toggle stats */}
                                <div
                                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                    onClick={() => toggleStats(m.match_id)}
                                >
                                    {/* Win/Loss icon */}
                                    {playerFaction && (
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
                                            playerWon
                                                ? 'bg-emerald-500/15 border-emerald-500/30'
                                                : 'bg-rose-500/15 border-rose-500/30'
                                        }`}>
                                            {playerWon
                                                ? <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                                                : <Skull className="w-3.5 h-3.5 text-rose-400" />}
                                        </div>
                                    )}

                                    {/* Score */}
                                    <div className="text-2xl font-black tabular-nums leading-none shrink-0 w-[76px]">
                                        <span className={winner === 'faction1' ? 'text-emerald-400' : 'text-zinc-400'}>{score1}</span>
                                        <span className="text-zinc-600 mx-1.5 text-base font-normal">–</span>
                                        <span className={winner === 'faction2' ? 'text-emerald-400' : 'text-zinc-400'}>{score2}</span>
                                    </div>

                                    {/* Teams + map */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold">
                                            <span className={winner === 'faction1' ? 'text-emerald-400' : 'text-zinc-300'}>{f1?.nickname}</span>
                                            <span className="text-zinc-600 mx-2 font-normal text-xs">vs</span>
                                            <span className={winner === 'faction2' ? 'text-emerald-400' : 'text-zinc-300'}>{f2?.nickname}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {mapName && (
                                                <span className="inline-flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    <MapIcon className="w-2.5 h-2.5" />{mapName}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-zinc-700 font-mono truncate">{m.match_id}</span>
                                        </div>
                                    </div>

                                    {/* Date + chevron */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        {date && <span className="text-xs text-zinc-500">{date}</span>}
                                        <div className="text-zinc-500">
                                            {loadingStats === m.match_id
                                                ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                                : isExpanded
                                                    ? <ChevronUp className="w-4 h-4" />
                                                    : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded scoreboard */}
                                {isExpanded && stats && (
                                    <div className="border-t border-zinc-800 bg-black/50 px-5 py-5 space-y-6 animate-in slide-in-from-top-2 duration-300">

                                        {/* Map + match id header */}
                                        {mapName && (
                                            <div className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest">
                                                <MapIcon className="w-3.5 h-3.5 text-orange-500" />
                                                {mapName}
                                                <span className="text-zinc-700">·</span>
                                                <span className="text-zinc-600 normal-case font-mono font-normal tracking-normal">{m.match_id}</span>
                                            </div>
                                        )}

                                        {(() => {
                                            const teams: any[] = stats.rounds?.[0]?.teams || [];
                                            const scores = teams.map((t: any) => parseInt(t.team_stats?.['Final Score'] || '0', 10));
                                            const maxScore = Math.max(...scores);
                                            return teams.map((team: any, ti: number) => {
                                            const isWinnerTeam = parseInt(team.team_stats?.['Final Score'] || '0', 10) === maxScore && maxScore > 0;
                                            return (
                                                <div key={ti}>
                                                    {/* Team header */}
                                                    <div className={`flex items-center gap-2 mb-3 ${isWinnerTeam ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                                        <div className={`w-1.5 h-4 rounded-full shrink-0 ${isWinnerTeam ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                                                        <span className="text-xs font-black uppercase tracking-widest">
                                                            {team.team_stats?.['Team']}
                                                        </span>
                                                        <span className={`text-xl font-black leading-none ${isWinnerTeam ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {team.team_stats?.['Final Score']}
                                                        </span>
                                                        {isWinnerTeam && <Trophy className="w-3.5 h-3.5 text-emerald-400" />}
                                                    </div>

                                                    {/* Scoreboard table */}
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-[11px] text-left border-separate border-spacing-y-1">
                                                            <thead>
                                                                <tr className="text-zinc-600 uppercase font-black tracking-wider">
                                                                    <th className="pb-1 pl-3">Player</th>
                                                                    <th className="pb-1 text-center">K</th>
                                                                    <th className="pb-1 text-center">D</th>
                                                                    <th className="pb-1 text-center">A</th>
                                                                    <th className="pb-1 text-center">K/D</th>
                                                                    <th className="pb-1 text-center">HS%</th>
                                                                    <th className="pb-1 text-center">ADR</th>
                                                                    <th className="pb-1 text-center pr-3">MVPs</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {team.players?.map((p: any, pi: number) => {
                                                                    const ps = p.player_stats;
                                                                    const isTarget = playerData && p.player_id === playerData.player_id;
                                                                    const kd = parseFloat(ps?.['K/D Ratio'] || '0');
                                                                    const kdColor = kd >= 1.5
                                                                        ? 'text-emerald-400'
                                                                        : kd >= 1.0
                                                                            ? 'text-zinc-200'
                                                                            : 'text-rose-400';
                                                                    return (
                                                                        <tr
                                                                            key={pi}
                                                                            className={`transition-colors rounded-lg ${
                                                                                isTarget
                                                                                    ? 'bg-orange-500/10 ring-1 ring-orange-500/25'
                                                                                    : 'hover:bg-zinc-800/40'
                                                                            }`}
                                                                        >
                                                                            <td className="py-2 pl-3 rounded-l-lg">
                                                                                <span className={`font-bold ${isTarget ? 'text-orange-300' : 'text-zinc-200'}`}>
                                                                                    {p.nickname}
                                                                                </span>
                                                                            </td>
                                                                            <td className="text-center font-bold text-white tabular-nums">{ps?.['Kills']}</td>
                                                                            <td className="text-center text-rose-400 tabular-nums">{ps?.['Deaths']}</td>
                                                                            <td className="text-center text-zinc-400 tabular-nums">{ps?.['Assists'] ?? '–'}</td>
                                                                            <td className={`text-center font-bold tabular-nums ${kdColor}`}>{ps?.['K/D Ratio']}</td>
                                                                            <td className="text-center text-zinc-300 tabular-nums">{ps?.['Headshots %']}%</td>
                                                                            <td className="text-center text-zinc-300 tabular-nums">{ps?.['ADR'] ?? '–'}</td>
                                                                            <td className="text-center text-zinc-400 tabular-nums pr-3 rounded-r-lg">{ps?.['MVPs'] ?? '–'}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                            });
                                        })()}
                                    </div>
                                )}

                                {isExpanded && !stats && loadingStats !== m.match_id && (
                                    <div className="border-t border-zinc-800 px-5 py-4 text-xs text-zinc-500 italic">
                                        Loading stats...
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
};

export default FaceitTest;
