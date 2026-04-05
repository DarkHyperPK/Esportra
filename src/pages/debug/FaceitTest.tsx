import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Loader2, Search, ChevronDown, ChevronUp, Trophy, Skull,
    Map as MapIcon, Star, Crown, Crosshair, Target, RefreshCw, Swords
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

/* ── Map theme config ── */
const MAP_THEMES: Record<string, { gradient: string; text: string; bg: string }> = {
    mirage:   { gradient: 'from-amber-500/30 to-amber-900/10', text: 'text-amber-300', bg: 'bg-amber-500' },
    dust:     { gradient: 'from-yellow-500/25 to-yellow-900/10', text: 'text-yellow-300', bg: 'bg-yellow-500' },
    inferno:  { gradient: 'from-orange-500/30 to-red-900/10', text: 'text-orange-300', bg: 'bg-orange-500' },
    nuke:     { gradient: 'from-blue-500/25 to-blue-900/10', text: 'text-blue-300', bg: 'bg-blue-500' },
    ancient:  { gradient: 'from-teal-500/25 to-emerald-900/10', text: 'text-teal-300', bg: 'bg-teal-500' },
    anubis:   { gradient: 'from-violet-500/25 to-purple-900/10', text: 'text-violet-300', bg: 'bg-violet-500' },
    vertigo:  { gradient: 'from-cyan-500/25 to-cyan-900/10', text: 'text-cyan-300', bg: 'bg-cyan-500' },
    overpass: { gradient: 'from-green-500/25 to-green-900/10', text: 'text-green-300', bg: 'bg-green-500' },
};
const getMapTheme = (map: string) => {
    const key = Object.keys(MAP_THEMES).find(k => map.toLowerCase().includes(k));
    return MAP_THEMES[key || ''] || { gradient: 'from-zinc-500/20 to-zinc-900/10', text: 'text-zinc-300', bg: 'bg-zinc-500' };
};

/* ── Skill level colors ── */
const getSkillColor = (level: number) => {
    if (level <= 3) return { bar: 'bg-zinc-400', text: 'text-zinc-400', glow: '' };
    if (level <= 5) return { bar: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' };
    if (level <= 7) return { bar: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/20' };
    if (level <= 9) return { bar: 'bg-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/20' };
    return { bar: 'bg-red-600', text: 'text-red-400', glow: 'shadow-red-500/30' };
};

/* ── Stat bar component ── */
const StatBar = ({ value, max, color, label, suffix = '' }: {
    value: number; max: number; color: string; label: string; suffix?: string;
}) => (
    <div className="space-y-1">
        <div className="flex justify-between items-baseline">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{label}</span>
            <span className="text-xs font-bold text-zinc-300 tabular-nums">{value}{suffix}</span>
        </div>
        <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
                style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
            />
        </div>
    </div>
);

const FaceitTest = () => {
    const [nickname, setNickname] = useState("");
    const [playerData, setPlayerData] = useState<any>(null); // Faceit player API response
    const [matches, setMatches] = useState<any[]>([]); // Faceit match history items
    const [matchStats, setMatchStats] = useState<Record<string, any>>({}); // match_id → stats
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
        } catch (err: any) { // Faceit API error
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
        } catch (err: any) { // Faceit API error
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
        } catch (err: any) { // Faceit API error
            toast({ title: "Stats error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingStats(null);
        }
    };

    // Faceit API returns roster under both `roster` and `players` keys depending on version
    const getPlayerFaction = (match: any): 'faction1' | 'faction2' | null => {
        if (!playerData?.player_id) return null;
        const pid = playerData.player_id;
        for (const faction of ['faction1', 'faction2'] as const) {
            const team = match.teams?.[faction];
            const members: any[] = team?.roster || team?.players || [];
            if (members.some((r: any) => r.player_id === pid)) return faction;
        }
        return null;
    };

    const cs2 = playerData?.games?.cs2;
    const loading = loadingPlayer || loadingHistory;

    // Compute aggregate stats
    const aggregateStats = useMemo(() => {
        if (!playerData || matches.length === 0) return null;
        const total = matches.length;
        const wins = matches.filter(m => {
            const pf = getPlayerFaction(m);
            return pf && m.results?.winner === pf;
        }).length;
        const kdValues: number[] = [];
        const killValues: number[] = [];
        const hsValues: number[] = [];
        Object.values(matchStats).forEach((s: any) => {
            const teams: any[] = s?.rounds?.[0]?.teams || [];
            teams.forEach((t: any) => {
                t.players?.forEach((p: any) => {
                    if (p.player_id === playerData.player_id) {
                        const kd = parseFloat(p.player_stats?.['K/D Ratio'] || '0');
                        const kills = parseInt(p.player_stats?.Kills || '0', 10);
                        const hs = parseFloat(p.player_stats?.['Headshots %'] || '0');
                        if (kd > 0) kdValues.push(kd);
                        if (kills > 0) killValues.push(kills);
                        if (hs > 0) hsValues.push(hs);
                    }
                });
            });
        });
        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        const recentForm = matches.slice(0, 8).map(m => {
            const pf = getPlayerFaction(m);
            return pf ? m.results?.winner === pf : null;
        });
        return {
            wins, losses: total - wins, total,
            winRate: Math.round((wins / total) * 100),
            avgKD: avg(kdValues),
            avgKills: avg(killValues),
            avgHS: avg(hsValues),
            recentForm,
            statsLoaded: kdValues.length,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerData, matches, matchStats]);

    const skillColor = cs2 ? getSkillColor(cs2.skill_level) : null;

    return (
        <div className="min-h-screen bg-[#050505]">
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 pb-32">

                {/* ═══ HEADER ═══ */}
                <div className="mb-10">
                    <div className="flex items-end gap-3 mb-2">
                        <Crosshair className="w-8 h-8 text-orange-500" />
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
                            CS2 <span className="text-orange-500">Stats</span>
                        </h1>
                    </div>
                    <p className="text-zinc-600 text-sm ml-11">Search any Faceit player · Match history & performance</p>
                </div>

                {/* ═══ SEARCH ═══ */}
                <div className="flex gap-2 mb-10 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <Input
                            placeholder="Enter Faceit nickname..."
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchPlayer()}
                            className="bg-zinc-900/50 border-zinc-800 text-white h-11 pl-11 text-sm placeholder:text-zinc-600 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-lg"
                        />
                    </div>
                    <Button
                        onClick={fetchPlayer}
                        disabled={loading || !nickname.trim()}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-11 px-6 rounded-lg shrink-0"
                    >
                        {loadingPlayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                </div>

                {/* ═══ PLAYER CARD ═══ */}
                {playerData && cs2 && aggregateStats && (
                    <div className="mb-10 rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900/40">
                        {/* Top banner */}
                        <div className={`h-1.5 ${skillColor?.bar || 'bg-zinc-700'}`} />

                        <div className="p-5 sm:p-6">
                            {/* Row 1: Identity */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative shrink-0">
                                    <img
                                        src={playerData.avatar || ''}
                                        alt={playerData.nickname}
                                        className="w-16 h-16 rounded-xl object-cover bg-zinc-800 border border-zinc-700"
                                        onError={e => { (e.currentTarget as HTMLImageElement).src = ''; }}
                                    />
                                    <div className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-md ${skillColor?.bar || 'bg-zinc-600'} flex items-center justify-center text-white text-[11px] font-black shadow-lg ${skillColor?.glow || ''}`}>
                                        {cs2.skill_level}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h2 className="text-xl sm:text-2xl font-black text-white truncate">{playerData.nickname}</h2>
                                        {playerData.country && (
                                            <span className="text-xs text-zinc-500 uppercase font-bold bg-zinc-800 px-2 py-0.5 rounded">
                                                {playerData.country}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-sm">
                                        <span className={`font-black tabular-nums ${skillColor?.text || 'text-zinc-400'}`}>{cs2.faceit_elo} ELO</span>
                                        <span className="text-zinc-700">·</span>
                                        <span className="text-zinc-500">{cs2.region}</span>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => fetchHistory(playerData.player_id)}
                                    disabled={loadingHistory}
                                    className="text-zinc-500 hover:text-white shrink-0"
                                >
                                    {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                </Button>
                            </div>

                            {/* Row 2: Stats grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {/* Win Rate */}
                                <div className="bg-zinc-800/50 rounded-lg p-3.5 text-center">
                                    <div className={`text-2xl font-black tabular-nums ${aggregateStats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {aggregateStats.winRate}%
                                    </div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-1">Win Rate</div>
                                    <div className="text-[10px] text-zinc-600 mt-0.5">
                                        {aggregateStats.wins}W {aggregateStats.losses}L
                                    </div>
                                </div>

                                {/* K/D */}
                                <div className="bg-zinc-800/50 rounded-lg p-3.5 text-center">
                                    <div className={`text-2xl font-black tabular-nums ${
                                        aggregateStats.avgKD !== null
                                            ? aggregateStats.avgKD >= 1.0 ? 'text-emerald-400' : 'text-rose-400'
                                            : 'text-zinc-600'
                                    }`}>
                                        {aggregateStats.avgKD !== null ? aggregateStats.avgKD.toFixed(2) : '—'}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-1">Avg K/D</div>
                                    <div className="text-[10px] text-zinc-600 mt-0.5">{aggregateStats.statsLoaded} matches</div>
                                </div>

                                {/* Avg Kills */}
                                <div className="bg-zinc-800/50 rounded-lg p-3.5 text-center">
                                    <div className="text-2xl font-black tabular-nums text-white">
                                        {aggregateStats.avgKills !== null ? Math.round(aggregateStats.avgKills) : '—'}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-1">Avg Kills</div>
                                    <div className="text-[10px] text-zinc-600 mt-0.5">per match</div>
                                </div>

                                {/* HS% */}
                                <div className="bg-zinc-800/50 rounded-lg p-3.5 text-center">
                                    <div className="text-2xl font-black tabular-nums text-sky-400">
                                        {aggregateStats.avgHS !== null ? Math.round(aggregateStats.avgHS) + '%' : '—'}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-1">Headshot %</div>
                                    <div className="text-[10px] text-zinc-600 mt-0.5">average</div>
                                </div>
                            </div>

                            {/* Row 3: Recent form */}
                            <div className="mt-4 flex items-center gap-3">
                                <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold shrink-0">Recent</span>
                                <div className="flex gap-1">
                                    {aggregateStats.recentForm.map((won, i) => (
                                        <div
                                            key={i}
                                            className={`w-6 h-1.5 rounded-full transition-colors ${
                                                won === null ? 'bg-zinc-700' : won ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`}
                                            title={won === null ? 'Unknown' : won ? 'Win' : 'Loss'}
                                        />
                                    ))}
                                </div>
                                {/* Skill bar */}
                                <div className="ml-auto flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold">Lvl</span>
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 10 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-3 h-1.5 rounded-sm ${i < cs2.skill_level ? (skillColor?.bar || 'bg-zinc-500') : 'bg-zinc-800'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ MATCH HISTORY ═══ */}
                {loadingHistory && matches.length === 0 && (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full bg-zinc-900/40 rounded-lg" />
                        ))}
                    </div>
                )}

                {matches.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Swords className="w-4 h-4 text-zinc-600" />
                            <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                                Match History
                            </span>
                            <span className="text-xs text-zinc-700">{matches.length} games</span>
                        </div>

                        <div className="space-y-1.5">
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
                                const mapTheme = getMapTheme(mapName);
                                const date = m.finished_at
                                    ? new Date(m.finished_at * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                    : '';

                                return (
                                    <div key={m.match_id} className="rounded-lg overflow-hidden border border-zinc-800/60 bg-zinc-900/30">
                                        {/* Collapsed row */}
                                        <button
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                                            onClick={() => toggleStats(m.match_id)}
                                            aria-expanded={isExpanded}
                                        >
                                            {/* W/L indicator */}
                                            <div className={`w-1 h-8 rounded-full shrink-0 ${
                                                playerFaction ? (playerWon ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-zinc-700'
                                            }`} />

                                            {/* Result text */}
                                            {playerFaction && (
                                                <span className={`text-[10px] font-black uppercase w-6 shrink-0 ${
                                                    playerWon ? 'text-emerald-400' : 'text-rose-400'
                                                }`}>
                                                    {playerWon ? 'W' : 'L'}
                                                </span>
                                            )}

                                            {/* Score */}
                                            <div className="flex items-center gap-1 shrink-0 w-14 justify-center">
                                                <span className={`text-lg font-black tabular-nums ${winner === 'faction1' ? 'text-white' : 'text-zinc-500'}`}>{score1}</span>
                                                <span className="text-zinc-700 text-xs">:</span>
                                                <span className={`text-lg font-black tabular-nums ${winner === 'faction2' ? 'text-white' : 'text-zinc-500'}`}>{score2}</span>
                                            </div>

                                            {/* Teams */}
                                            <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm">
                                                <span className={`truncate font-semibold ${
                                                    playerFaction === 'faction1'
                                                        ? 'text-orange-400'
                                                        : winner === 'faction1' ? 'text-zinc-200' : 'text-zinc-500'
                                                }`}>{f1?.nickname}</span>
                                                <span className="text-zinc-700 text-xs shrink-0">vs</span>
                                                <span className={`truncate font-semibold ${
                                                    playerFaction === 'faction2'
                                                        ? 'text-orange-400'
                                                        : winner === 'faction2' ? 'text-zinc-200' : 'text-zinc-500'
                                                }`}>{f2?.nickname}</span>
                                            </div>

                                            {/* Map */}
                                            {mapName && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${mapTheme.bg}/10 ${mapTheme.text} shrink-0 hidden sm:block`}>
                                                    {mapName.replace('de_', '')}
                                                </span>
                                            )}

                                            {/* Date */}
                                            {date && <span className="text-[10px] text-zinc-600 shrink-0 w-12 text-right hidden sm:block">{date}</span>}

                                            {/* Chevron */}
                                            <div className="text-zinc-600 shrink-0">
                                                {loadingStats === m.match_id
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                                                    : isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </div>
                                        </button>

                                        {/* ── Expanded scoreboard ── */}
                                        {isExpanded && stats && (() => {
                                            const teams: any[] = stats.rounds?.[0]?.teams || [];
                                            const allPlayers = teams.flatMap((t: any) => t.players || []);
                                            const maxKills = Math.max(...allPlayers.map((p: any) => parseInt(p.player_stats?.Kills || '0', 10)), 1);
                                            const maxADR = Math.max(...allPlayers.map((p: any) => parseFloat(p.player_stats?.ADR || '0')), 1);
                                            const teamScores = teams.map((t: any) => parseInt(t.team_stats?.['Final Score'] || '0', 10));
                                            const maxTeamScore = Math.max(...teamScores);

                                            // Find MVP
                                            let mvp: any = null;
                                            let mvpKD = 0;
                                            allPlayers.forEach((p: any) => {
                                                const kd = parseFloat(p.player_stats?.['K/D Ratio'] || '0');
                                                if (kd > mvpKD) { mvpKD = kd; mvp = p; }
                                            });

                                            return (
                                                <div className="border-t border-zinc-800/60 bg-[#080809]">
                                                    {/* Map header strip */}
                                                    {mapName && (
                                                        <div className={`flex items-center justify-between px-4 py-2.5 bg-gradient-to-r ${mapTheme.gradient}`}>
                                                            <div className="flex items-center gap-2">
                                                                <MapIcon className={`w-3.5 h-3.5 ${mapTheme.text}`} />
                                                                <span className={`text-xs font-black uppercase tracking-widest ${mapTheme.text}`}>
                                                                    {mapName}
                                                                </span>
                                                            </div>
                                                            {date && <span className="text-[10px] text-zinc-500">{date}</span>}
                                                        </div>
                                                    )}

                                                    {/* MVP banner */}
                                                    {mvp && (
                                                        <div className="mx-4 mt-4 mb-2 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/10">
                                                            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                                                            <span className="text-[10px] text-amber-500/70 uppercase font-bold tracking-widest shrink-0">MVP</span>
                                                            <span className="text-sm font-black text-amber-300 truncate">{mvp.nickname}</span>
                                                            <div className="ml-auto flex gap-4 text-xs tabular-nums shrink-0">
                                                                <span className="text-emerald-400 font-bold">{mvp.player_stats?.['K/D Ratio']} K/D</span>
                                                                <span className="text-white font-bold hidden sm:inline">{mvp.player_stats?.Kills}K</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Team scoreboards */}
                                                    <div className="p-4 space-y-4">
                                                        {teams.map((team: any, ti: number) => {
                                                            const teamScore = parseInt(team.team_stats?.['Final Score'] || '0', 10);
                                                            const isWinner = teamScore === maxTeamScore && maxTeamScore > 0;
                                                            const sortedPlayers = [...(team.players || [])].sort(
                                                                (a: any, b: any) => parseFloat(b.player_stats?.['K/D Ratio'] || '0') - parseFloat(a.player_stats?.['K/D Ratio'] || '0')
                                                            );

                                                            return (
                                                                <div key={ti}>
                                                                    {/* Team header */}
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-1 h-4 rounded-full ${isWinner ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                                                                {team.team_stats?.Team || `Team ${ti + 1}`}
                                                                            </span>
                                                                            {isWinner && <Trophy className="w-3 h-3 text-emerald-500" />}
                                                                        </div>
                                                                        <span className={`text-lg font-black ${isWinner ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                            {teamScore}
                                                                        </span>
                                                                    </div>

                                                                    {/* Column headers */}
                                                                    <div className="hidden sm:grid grid-cols-12 gap-2 px-3 mb-1 text-[9px] text-zinc-600 uppercase tracking-wider font-bold">
                                                                        <div className="col-span-3">Player</div>
                                                                        <div className="col-span-1 text-center">K</div>
                                                                        <div className="col-span-1 text-center">D</div>
                                                                        <div className="col-span-1 text-center">A</div>
                                                                        <div className="col-span-2">K/D</div>
                                                                        <div className="col-span-2">HS%</div>
                                                                        <div className="col-span-1">ADR</div>
                                                                        <div className="col-span-1 text-center">★</div>
                                                                    </div>

                                                                    {/* Player rows */}
                                                                    <div className="space-y-0.5">
                                                                        {sortedPlayers.map((p: any, pi: number) => {
                                                                            const ps = p.player_stats;
                                                                            const kills = parseInt(ps?.Kills || '0', 10);
                                                                            const deaths = parseInt(ps?.Deaths || '0', 10);
                                                                            const assists = parseInt(ps?.Assists || '0', 10);
                                                                            const kd = parseFloat(ps?.['K/D Ratio'] || '0');
                                                                            const hs = parseFloat(ps?.['Headshots %'] || '0');
                                                                            const adr = parseFloat(ps?.ADR || '0');
                                                                            const mvps = parseInt(ps?.MVPs || '0', 10);
                                                                            const isTarget = playerData && p.player_id === playerData.player_id;
                                                                            const isMvp = mvp?.player_id === p.player_id;

                                                                            return (
                                                                                <div
                                                                                    key={pi}
                                                                                    className={`rounded-md px-3 py-2 transition-colors ${
                                                                                        isTarget
                                                                                            ? 'bg-orange-500/8 border border-orange-500/15'
                                                                                            : isMvp
                                                                                                ? 'bg-amber-500/5'
                                                                                                : 'hover:bg-white/[0.015]'
                                                                                    }`}
                                                                                >
                                                                                    {/* Desktop */}
                                                                                    <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                                                                                        <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                                                                                            {isMvp && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                                                                                            <span className={`text-sm font-semibold truncate ${
                                                                                                isTarget ? 'text-orange-400' : 'text-zinc-200'
                                                                                            }`}>{p.nickname}</span>
                                                                                        </div>
                                                                                        <div className="col-span-1 text-center text-sm font-bold text-white tabular-nums">{kills}</div>
                                                                                        <div className="col-span-1 text-center text-sm text-rose-400/80 tabular-nums">{deaths}</div>
                                                                                        <div className="col-span-1 text-center text-sm text-zinc-500 tabular-nums">{assists}</div>

                                                                                        {/* K/D bar */}
                                                                                        <div className="col-span-2 flex items-center gap-1.5">
                                                                                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className={`h-full rounded-full ${kd >= 1.5 ? 'bg-emerald-400' : kd >= 1.0 ? 'bg-emerald-600' : 'bg-rose-500'}`}
                                                                                                    style={{ width: `${Math.min((kd / 2.5) * 100, 100)}%` }}
                                                                                                />
                                                                                            </div>
                                                                                            <span className={`text-[11px] font-bold tabular-nums w-8 text-right ${
                                                                                                kd >= 1.5 ? 'text-emerald-400' : kd >= 1.0 ? 'text-zinc-300' : 'text-rose-400'
                                                                                            }`}>{kd.toFixed(2)}</span>
                                                                                        </div>

                                                                                        {/* HS% bar */}
                                                                                        <div className="col-span-2 flex items-center gap-1.5">
                                                                                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                                <div className="h-full bg-sky-500/80 rounded-full" style={{ width: `${Math.min(hs, 100)}%` }} />
                                                                                            </div>
                                                                                            <span className="text-[11px] text-zinc-400 tabular-nums w-8 text-right">{hs}%</span>
                                                                                        </div>

                                                                                        {/* ADR */}
                                                                                        <div className="col-span-1 text-[11px] text-zinc-400 tabular-nums text-right">{Math.round(adr)}</div>

                                                                                        {/* MVPs */}
                                                                                        <div className="col-span-1 flex justify-center">
                                                                                            {mvps > 0 ? (
                                                                                                <span className="text-[10px] text-amber-400 font-bold">{mvps}★</span>
                                                                                            ) : (
                                                                                                <span className="text-zinc-800">—</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Mobile */}
                                                                                    <div className="sm:hidden space-y-2">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                {isMvp && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                                                                                <span className={`text-sm font-semibold ${isTarget ? 'text-orange-400' : 'text-zinc-200'}`}>
                                                                                                    {p.nickname}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="text-xs tabular-nums space-x-1">
                                                                                                <span className="text-white font-bold">{kills}</span>
                                                                                                <span className="text-zinc-700">/</span>
                                                                                                <span className="text-rose-400">{deaths}</span>
                                                                                                <span className="text-zinc-700">/</span>
                                                                                                <span className="text-zinc-500">{assists}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex gap-4 text-[10px]">
                                                                                            <span className={kd >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}>{kd.toFixed(2)} K/D</span>
                                                                                            <span className="text-zinc-400">{hs}% HS</span>
                                                                                            <span className="text-zinc-500">{Math.round(adr)} ADR</span>
                                                                                            {mvps > 0 && <span className="text-amber-400">{mvps}★</span>}
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
                                                </div>
                                            );
                                        })()}

                                        {/* Loading state */}
                                        {isExpanded && !stats && loadingStats === m.match_id && (
                                            <div className="border-t border-zinc-800/60 px-4 py-6 flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                                <span className="text-xs text-zinc-500">Loading stats…</span>
                                            </div>
                                        )}
                                        {isExpanded && !stats && loadingStats !== m.match_id && (
                                            <div className="border-t border-zinc-800/60 px-4 py-5 text-xs text-zinc-600 text-center">
                                                Stats unavailable
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceitTest;
