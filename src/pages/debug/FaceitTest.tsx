import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, ChevronDown, ChevronUp, Trophy, Skull, Map as MapIcon, Star, Crown, Crosshair } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
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
        const data = await apiClient.post<any>('/api/integrations/faceit/proxy', { endpoint });
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
        <div className="min-h-screen bg-[#050505]">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 pb-32 space-y-8">

                {/* ═══════════════ HEADER + SEARCH ═══════════════ */}
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white">
                            FACEIT<span className="text-orange-500">TRACKER</span>
                        </h1>
                        <p className="text-zinc-500 text-sm font-medium">CS2 Performance Analytics · Powered by Faceit Data API</p>
                    </div>

                    <div className="flex gap-3 max-w-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                            <Input
                                placeholder="Search player (e.g. s1mple)"
                                value={nickname}
                                onChange={e => setNickname(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && fetchPlayer()}
                                className="bg-[#0a0a0c] border-zinc-800 text-white h-12 pl-10 text-sm placeholder:text-zinc-600 focus:border-orange-500/50 focus:ring-orange-500/20 rounded-xl"
                            />
                        </div>
                        <Button
                            onClick={fetchPlayer}
                            disabled={loading || !nickname.trim()}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 h-12 shrink-0 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/20"
                            aria-label="Search player"
                        >
                            {loadingPlayer ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SEARCH'}
                        </Button>
                    </div>
                </div>

                {/* ═══════════════ PLAYER OVERVIEW CARD ═══════════════ */}
                {playerData && cs2 && (() => {
                    const totalMatches = matches.length;
                    const wins = matches.filter(m => {
                        const pf = getPlayerFaction(m);
                        return pf && m.results?.winner === pf;
                    }).length;
                    const losses = totalMatches - wins;
                    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

                    const kdValues: number[] = [];
                    Object.values(matchStats).forEach((s: any) => {
                        const statsTeams: any[] = s?.rounds?.[0]?.teams || [];
                        statsTeams.forEach((t: any) => {
                            t.players?.forEach((p: any) => {
                                if (p.player_id === playerData.player_id) {
                                    const kd = parseFloat(p.player_stats?.['K/D Ratio'] || '0');
                                    if (kd > 0) kdValues.push(kd);
                                }
                            });
                        });
                    });
                    const avgKD = kdValues.length > 0 ? (kdValues.reduce((a: number, b: number) => a + b, 0) / kdValues.length) : null;

                    const recentForm = matches.slice(0, 5).map(m => {
                        const pf = getPlayerFaction(m);
                        return pf && m.results?.winner === pf;
                    });

                    const circumference = 2 * Math.PI * 40;
                    const strokeDash = (winRate / 100) * circumference;

                    return (
                        <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />

                            <div className="p-6 sm:p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

                                    {/* LEFT — Avatar + Info */}
                                    <div className="flex items-center gap-5">
                                        <div className="relative shrink-0">
                                            <img
                                                src={playerData.avatar || ''}
                                                alt={`${playerData.nickname} avatar`}
                                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-orange-500/30 bg-zinc-800"
                                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                            />
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-orange-500/30">
                                                {cs2.skill_level}
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                                                {playerData.nickname}
                                            </h2>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                {playerData.country && (
                                                    <span className="text-sm text-zinc-400 uppercase font-bold tracking-wide">
                                                        {playerData.country}
                                                    </span>
                                                )}
                                                <span className="text-zinc-700">·</span>
                                                <span className="text-sm text-zinc-500 font-medium">{cs2.region}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => fetchHistory(playerData.player_id)}
                                                disabled={loadingHistory}
                                                className="mt-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs font-bold h-7 px-3"
                                            >
                                                {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                Refresh History
                                            </Button>
                                        </div>
                                    </div>

                                    {/* CENTER — Aggregate Stats */}
                                    <div className="flex items-center justify-center gap-6 sm:gap-8">
                                        {/* Win Rate Ring */}
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                                                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
                                                    <circle cx="48" cy="48" r="40" fill="none" stroke="#27272a" strokeWidth="6" />
                                                    <circle
                                                        cx="48" cy="48" r="40" fill="none"
                                                        stroke={winRate >= 50 ? '#10b981' : '#f43f5e'}
                                                        strokeWidth="6"
                                                        strokeDasharray={`${strokeDash} ${circumference}`}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-700 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-xl sm:text-2xl font-black text-white">{winRate}%</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">Win Rate</span>
                                            <span className="text-[10px] text-zinc-600">{wins}W – {losses}L</span>
                                        </div>

                                        {/* Avg K/D */}
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-900 border border-white/5 flex flex-col items-center justify-center">
                                                <Crosshair className="w-3.5 h-3.5 text-zinc-600 mb-1" />
                                                <span className={`text-xl sm:text-2xl font-black ${avgKD !== null ? (avgKD >= 1.0 ? 'text-emerald-400' : 'text-rose-400') : 'text-zinc-600'}`}>
                                                    {avgKD !== null ? avgKD.toFixed(2) : '—'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">Avg K/D</span>
                                            <span className="text-[10px] text-zinc-600">{kdValues.length} match{kdValues.length !== 1 ? 'es' : ''}</span>
                                        </div>

                                        {/* Recent Form */}
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-900 border border-white/5 flex flex-col items-center justify-center gap-2">
                                                <div className="flex gap-1.5">
                                                    {recentForm.map((won, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ${
                                                                won ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'
                                                            }`}
                                                            title={won ? 'Win' : 'Loss'}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-zinc-500 font-bold">
                                                    {recentForm.filter(Boolean).length}/{recentForm.length}
                                                </span>
                                            </div>
                                            <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">Form</span>
                                            <span className="text-[10px] text-zinc-600">Last {recentForm.length}</span>
                                        </div>
                                    </div>

                                    {/* RIGHT — ELO + Skill Level Bar */}
                                    <div className="flex flex-col items-center md:items-end gap-3">
                                        <div className="text-center md:text-right">
                                            <div className="text-4xl sm:text-5xl font-black text-orange-400 tabular-nums leading-none">
                                                {cs2.faceit_elo}
                                            </div>
                                            <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">ELO Rating</div>
                                        </div>
                                        <div className="flex gap-1">
                                            {Array.from({ length: 10 }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-5 h-2 rounded-sm transition-colors ${
                                                        i < cs2.skill_level
                                                            ? cs2.skill_level <= 3
                                                                ? 'bg-zinc-400'
                                                                : cs2.skill_level <= 6
                                                                    ? 'bg-amber-500'
                                                                    : cs2.skill_level <= 8
                                                                        ? 'bg-orange-500'
                                                                        : 'bg-red-500'
                                                            : 'bg-zinc-800'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-zinc-500">Level {cs2.skill_level} / 10</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ═══════════════ MATCH HISTORY ═══════════════ */}
                {loadingHistory && matches.length === 0 ? (
                    <div className="space-y-4">
                        <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                            Loading match history…
                        </div>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full bg-zinc-900/50 rounded-2xl" />
                        ))}
                    </div>
                ) : matches.length > 0 ? (
                    <div className="space-y-4">
                        <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-orange-500" />
                            Match History · {matches.length} Games
                        </div>

                        <div className="space-y-3">
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
                                const mapName = stats?.rounds?.[0]?.round_stats?.Map || '';
                                const date = m.finished_at
                                    ? new Date(m.finished_at * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '';

                                const getMapGradient = (name: string) => {
                                    const n = name.toLowerCase();
                                    if (n.includes('mirage')) return 'from-amber-500/20 via-amber-700/10 to-transparent';
                                    if (n.includes('dust')) return 'from-yellow-500/20 via-yellow-700/10 to-transparent';
                                    if (n.includes('inferno')) return 'from-orange-600/25 via-red-800/10 to-transparent';
                                    if (n.includes('nuke')) return 'from-blue-500/20 via-blue-800/10 to-transparent';
                                    if (n.includes('ancient')) return 'from-teal-500/20 via-emerald-800/10 to-transparent';
                                    if (n.includes('anubis')) return 'from-purple-500/20 via-amber-800/10 to-transparent';
                                    if (n.includes('vertigo')) return 'from-cyan-500/20 via-cyan-800/10 to-transparent';
                                    if (n.includes('overpass')) return 'from-green-500/20 via-green-800/10 to-transparent';
                                    return 'from-zinc-600/20 via-zinc-800/10 to-transparent';
                                };
                                const getMapAccent = (name: string) => {
                                    const n = name.toLowerCase();
                                    if (n.includes('mirage')) return 'text-amber-400';
                                    if (n.includes('dust')) return 'text-yellow-400';
                                    if (n.includes('inferno')) return 'text-orange-400';
                                    if (n.includes('nuke')) return 'text-blue-400';
                                    if (n.includes('ancient')) return 'text-teal-400';
                                    if (n.includes('anubis')) return 'text-purple-400';
                                    if (n.includes('vertigo')) return 'text-cyan-400';
                                    if (n.includes('overpass')) return 'text-green-400';
                                    return 'text-zinc-400';
                                };
                                const mapGradient = getMapGradient(mapName);
                                const mapAccent = getMapAccent(mapName);

                                return (
                                    <div
                                        key={m.match_id}
                                        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                                            playerFaction
                                                ? playerWon
                                                    ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                                                    : 'border-rose-500/20 bg-rose-500/[0.03]'
                                                : 'border-white/5 bg-[#0a0a0c]'
                                        }`}
                                    >
                                        {/* Left win/loss accent strip */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                            playerFaction ? (playerWon ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-zinc-800'
                                        }`} />

                                        {/* Map gradient overlay */}
                                        {mapName && (
                                            <div className={`absolute inset-0 bg-gradient-to-r ${mapGradient} pointer-events-none`} />
                                        )}

                                        {/* ── Collapsed match row ── */}
                                        <div
                                            className="relative flex items-center gap-3 sm:gap-5 px-5 sm:px-7 py-4 sm:py-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                            onClick={() => toggleStats(m.match_id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={e => e.key === 'Enter' && toggleStats(m.match_id)}
                                            aria-expanded={isExpanded}
                                            aria-label={`Match ${f1?.nickname || 'Team 1'} vs ${f2?.nickname || 'Team 2'}, score ${score1} to ${score2}`}
                                        >
                                            {/* Win/Loss badge */}
                                            {playerFaction && (
                                                <div className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm ${
                                                    playerWon
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                                }`}>
                                                    {playerWon ? 'W' : 'L'}
                                                </div>
                                            )}

                                            {/* Score display */}
                                            <div className="shrink-0 flex items-center gap-1 sm:gap-2">
                                                <div className="text-right min-w-[55px] sm:min-w-[80px]">
                                                    <div className="text-[10px] text-zinc-500 font-medium truncate hidden sm:block">{f1?.nickname}</div>
                                                    <span className={`text-2xl sm:text-3xl font-black tabular-nums ${winner === 'faction1' ? 'text-white' : 'text-zinc-500'}`}>
                                                        {score1}
                                                    </span>
                                                </div>
                                                <span className="text-zinc-700 text-sm font-light mx-1">—</span>
                                                <div className="text-left min-w-[55px] sm:min-w-[80px]">
                                                    <div className="text-[10px] text-zinc-500 font-medium truncate hidden sm:block">{f2?.nickname}</div>
                                                    <span className={`text-2xl sm:text-3xl font-black tabular-nums ${winner === 'faction2' ? 'text-white' : 'text-zinc-500'}`}>
                                                        {score2}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Map badge + mobile team names */}
                                            <div className="flex-1 min-w-0 flex items-center gap-3">
                                                {mapName && (
                                                    <Badge className={`${mapAccent} bg-white/5 border-white/10 text-[10px] sm:text-xs font-bold shrink-0`}>
                                                        <MapIcon className="w-3 h-3 mr-1" />
                                                        {mapName}
                                                    </Badge>
                                                )}
                                                <div className="text-xs text-zinc-600 truncate sm:hidden">
                                                    {f1?.nickname} vs {f2?.nickname}
                                                </div>
                                            </div>

                                            {/* Date + Chevron */}
                                            <div className="flex items-center gap-3 shrink-0">
                                                {date && <span className="text-[10px] sm:text-xs text-zinc-600 hidden sm:block">{date}</span>}
                                                <div className="text-zinc-600">
                                                    {loadingStats === m.match_id
                                                        ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                                        : isExpanded
                                                            ? <ChevronUp className="w-4 h-4" />
                                                            : <ChevronDown className="w-4 h-4" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Expanded Scoreboard ── */}
                                        {isExpanded && stats && (() => {
                                            const teams: any[] = stats.rounds?.[0]?.teams || [];
                                            const allPlayers = teams.flatMap((t: any) => t.players || []);

                                            const maxADR = Math.max(...allPlayers.map((p: any) => parseFloat(p.player_stats?.ADR || '0')), 1);

                                            let mvpPlayer: any = null;
                                            let mvpKD = 0;
                                            allPlayers.forEach((p: any) => {
                                                const kd = parseFloat(p.player_stats?.['K/D Ratio'] || '0');
                                                if (kd > mvpKD) { mvpKD = kd; mvpPlayer = p; }
                                            });

                                            const teamScores = teams.map((t: any) => parseInt(t.team_stats?.['Final Score'] || '0', 10));
                                            const maxTeamScore = Math.max(...teamScores);

                                            return (
                                                <div className="relative border-t border-white/5 bg-black/60 px-4 sm:px-7 py-6 space-y-5">

                                                    {/* Map banner header */}
                                                    {mapName && (
                                                        <div className={`flex items-center justify-between rounded-xl px-5 py-3 bg-gradient-to-r ${mapGradient} border border-white/5`}>
                                                            <div className="flex items-center gap-3">
                                                                <MapIcon className={`w-5 h-5 ${mapAccent}`} />
                                                                <span className={`text-lg sm:text-xl font-black uppercase tracking-wider ${mapAccent}`}>{mapName}</span>
                                                            </div>
                                                            {date && <span className="text-xs text-zinc-600">{date}</span>}
                                                        </div>
                                                    )}

                                                    {/* MVP Highlight Card */}
                                                    {mvpPlayer && (
                                                        <div className="relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-4">
                                                            <Crown className="absolute right-4 top-3 w-8 h-8 text-orange-500/20" aria-hidden="true" />
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                                                                    <Star className="w-5 h-5 text-orange-400 fill-orange-400" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-[10px] text-orange-400/70 font-bold uppercase tracking-widest">Match MVP</div>
                                                                    <div className="text-lg font-black text-orange-300 truncate">{mvpPlayer.nickname}</div>
                                                                </div>
                                                                <div className="ml-auto flex gap-4 sm:gap-6 text-right">
                                                                    <div>
                                                                        <div className="text-[10px] text-zinc-500 uppercase">K/D</div>
                                                                        <div className="text-lg font-black text-emerald-400">{mvpPlayer.player_stats?.['K/D Ratio']}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-zinc-500 uppercase">Kills</div>
                                                                        <div className="text-lg font-black text-white">{mvpPlayer.player_stats?.Kills}</div>
                                                                    </div>
                                                                    <div className="hidden sm:block">
                                                                        <div className="text-[10px] text-zinc-500 uppercase">HS%</div>
                                                                        <div className="text-lg font-black text-zinc-300">{mvpPlayer.player_stats?.['Headshots %']}%</div>
                                                                    </div>
                                                                    <div className="hidden sm:block">
                                                                        <div className="text-[10px] text-zinc-500 uppercase">ADR</div>
                                                                        <div className="text-lg font-black text-zinc-300">{mvpPlayer.player_stats?.ADR}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Team Scoreboards */}
                                                    {teams.map((team: any, ti: number) => {
                                                        const teamScore = parseInt(team.team_stats?.['Final Score'] || '0', 10);
                                                        const isWinnerTeam = teamScore === maxTeamScore && maxTeamScore > 0;
                                                        const teamPlayers: any[] = [...(team.players || [])].sort(
                                                            (a: any, b: any) => parseFloat(b.player_stats?.['K/D Ratio'] || '0') - parseFloat(a.player_stats?.['K/D Ratio'] || '0')
                                                        );

                                                        return (
                                                            <div key={ti} className="space-y-2">
                                                                {/* Team Header */}
                                                                <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                                                                    isWinnerTeam
                                                                        ? 'bg-emerald-500/[0.07] border border-emerald-500/15'
                                                                        : 'bg-rose-500/[0.05] border border-rose-500/10'
                                                                }`}>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-1 h-6 rounded-full ${isWinnerTeam ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                        <span className="text-sm font-black text-white uppercase tracking-wide">
                                                                            {team.team_stats?.Team || `Team ${ti + 1}`}
                                                                        </span>
                                                                        {isWinnerTeam && <Trophy className="w-4 h-4 text-emerald-400" />}
                                                                    </div>
                                                                    <span className={`text-2xl font-black ${isWinnerTeam ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {teamScore}
                                                                    </span>
                                                                </div>

                                                                {/* Column Headers (desktop) */}
                                                                <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-1.5 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                                                                    <div className="col-span-3">Player</div>
                                                                    <div className="col-span-2 text-center">K / D / A</div>
                                                                    <div className="col-span-2 text-center">K/D Ratio</div>
                                                                    <div className="col-span-2 text-center">HS%</div>
                                                                    <div className="col-span-2 text-center">ADR</div>
                                                                    <div className="col-span-1 text-center">MVP</div>
                                                                </div>

                                                                {/* Player Rows */}
                                                                <div className="space-y-1">
                                                                    {teamPlayers.map((p: any, pi: number) => {
                                                                        const ps = p.player_stats;
                                                                        const kills = parseInt(ps?.Kills || '0', 10);
                                                                        const deaths = parseInt(ps?.Deaths || '0', 10);
                                                                        const assists = parseInt(ps?.Assists || '0', 10);
                                                                        const kd = parseFloat(ps?.['K/D Ratio'] || '0');
                                                                        const hsPercent = parseFloat(ps?.['Headshots %'] || '0');
                                                                        const adr = parseFloat(ps?.ADR || '0');
                                                                        const mvps = parseInt(ps?.MVPs || '0', 10);
                                                                        const isTarget = playerData && p.player_id === playerData.player_id;
                                                                        const isMvp = mvpPlayer?.player_id === p.player_id;

                                                                        return (
                                                                            <div
                                                                                key={pi}
                                                                                className={`rounded-xl transition-colors ${
                                                                                    isTarget
                                                                                        ? 'bg-orange-500/10 ring-1 ring-orange-500/25'
                                                                                        : isMvp
                                                                                            ? 'bg-amber-500/[0.05]'
                                                                                            : 'hover:bg-white/[0.02]'
                                                                                }`}
                                                                            >
                                                                                {/* Desktop layout */}
                                                                                <div className="hidden sm:grid grid-cols-12 gap-2 items-center px-4 py-2.5">
                                                                                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                                                                                        {isMvp && <Star className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400" />}
                                                                                        <span className={`text-sm font-bold truncate ${isTarget ? 'text-orange-400' : 'text-zinc-200'}`}>
                                                                                            {p.nickname}
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="col-span-2 text-center">
                                                                                        <span className="text-sm font-bold text-white tabular-nums">{kills}</span>
                                                                                        <span className="text-zinc-600 mx-0.5">/</span>
                                                                                        <span className="text-sm font-bold text-rose-400 tabular-nums">{deaths}</span>
                                                                                        <span className="text-zinc-600 mx-0.5">/</span>
                                                                                        <span className="text-sm text-zinc-500 tabular-nums">{assists}</span>
                                                                                    </div>

                                                                                    <div className="col-span-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                                                        kd >= 1.5 ? 'bg-emerald-400' : kd >= 1.0 ? 'bg-emerald-600' : 'bg-rose-500'
                                                                                                    }`}
                                                                                                    style={{ width: `${Math.min((kd / 2.5) * 100, 100)}%` }}
                                                                                                />
                                                                                            </div>
                                                                                            <span className={`text-xs font-bold tabular-nums min-w-[32px] text-right ${
                                                                                                kd >= 1.5 ? 'text-emerald-400' : kd >= 1.0 ? 'text-zinc-300' : 'text-rose-400'
                                                                                            }`}>
                                                                                                {kd.toFixed(2)}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="col-span-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                                                                                                    style={{ width: `${Math.min(hsPercent, 100)}%` }}
                                                                                                />
                                                                                            </div>
                                                                                            <span className="text-xs text-zinc-400 tabular-nums min-w-[32px] text-right">{hsPercent}%</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="col-span-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                                                                                    style={{ width: `${Math.min((adr / maxADR) * 100, 100)}%` }}
                                                                                                />
                                                                                            </div>
                                                                                            <span className="text-xs text-zinc-400 tabular-nums min-w-[28px] text-right">{Math.round(adr)}</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="col-span-1 flex items-center justify-center gap-0.5">
                                                                                        {mvps > 0 && Array.from({ length: Math.min(mvps, 5) }).map((_, si) => (
                                                                                            <Star key={si} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                                                                        ))}
                                                                                        {mvps === 0 && <span className="text-zinc-700 text-xs">—</span>}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Mobile layout */}
                                                                                <div className="sm:hidden px-4 py-3 space-y-2">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            {isMvp && <Star className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400" />}
                                                                                            <span className={`text-sm font-bold truncate ${isTarget ? 'text-orange-400' : 'text-zinc-200'}`}>
                                                                                                {p.nickname}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 text-xs tabular-nums shrink-0">
                                                                                            <span className="text-white font-bold">{kills}</span>
                                                                                            <span className="text-zinc-600">/</span>
                                                                                            <span className="text-rose-400 font-bold">{deaths}</span>
                                                                                            <span className="text-zinc-600">/</span>
                                                                                            <span className="text-zinc-500">{assists}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-3 gap-3">
                                                                                        <div>
                                                                                            <div className="text-[9px] text-zinc-600 uppercase mb-1">K/D</div>
                                                                                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className={`h-full rounded-full ${kd >= 1.0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                                                                    style={{ width: `${Math.min((kd / 2.5) * 100, 100)}%` }}
                                                                                                />
                                                                                            </div>
                                                                                            <div className={`text-[10px] font-bold mt-0.5 ${kd >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>{kd.toFixed(2)}</div>
                                                                                        </div>
                                                                                        <div>
                                                                                            <div className="text-[9px] text-zinc-600 uppercase mb-1">HS%</div>
                                                                                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(hsPercent, 100)}%` }} />
                                                                                            </div>
                                                                                            <div className="text-[10px] text-zinc-400 mt-0.5">{hsPercent}%</div>
                                                                                        </div>
                                                                                        <div>
                                                                                            <div className="text-[9px] text-zinc-600 uppercase mb-1">ADR</div>
                                                                                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((adr / maxADR) * 100, 100)}%` }} />
                                                                                            </div>
                                                                                            <div className="text-[10px] text-zinc-400 mt-0.5">{Math.round(adr)}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}

                                        {/* Loading stats spinner */}
                                        {isExpanded && !stats && loadingStats === m.match_id && (
                                            <div className="border-t border-white/5 px-7 py-8 flex items-center justify-center gap-3">
                                                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                                                <span className="text-sm text-zinc-500">Loading scoreboard…</span>
                                            </div>
                                        )}
                                        {isExpanded && !stats && loadingStats !== m.match_id && (
                                            <div className="border-t border-white/5 px-7 py-6 text-sm text-zinc-600 italic text-center">
                                                Stats unavailable for this match
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default FaceitTest;
