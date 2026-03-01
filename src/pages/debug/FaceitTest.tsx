import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Search, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
            // Auto-fetch match history
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
                toast({ title: "No CS2 matches found", description: "This player has no recent CS2 match history.", variant: "default" });
            }
        } catch (err: any) {
            toast({ title: "History error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingHistory(false);
        }
    };

    const toggleStats = async (matchId: string) => {
        if (expandedMatch === matchId) {
            setExpandedMatch(null);
            return;
        }
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

    const cs2 = playerData?.games?.cs2;
    const loading = loadingPlayer || loadingHistory;

    return (
        <div className="container mx-auto py-10 space-y-6 max-w-4xl pb-40">
            <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-white italic">
                    FACEIT<span className="text-orange-500">TRACKER</span> <span className="text-zinc-600 text-2xl not-italic font-normal">DEBUG</span>
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

            {/* Player Card */}
            {playerData && cs2 && (
                <Card className="bg-zinc-900/60 border-orange-500/20">
                    <CardContent className="pt-5">
                        <div className="flex items-center gap-4">
                            <img
                                src={playerData.avatar || ''}
                                alt=""
                                className="w-14 h-14 rounded-full object-cover border-2 border-orange-500/30 bg-zinc-800"
                                onError={e => { (e.currentTarget as HTMLImageElement).src = ''; (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
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
                    </CardContent>
                </Card>
            )}

            {/* Match History */}
            {loadingHistory && matches.length === 0 ? (
                <div className="space-y-3">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Fetching CS2 history...</div>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full bg-zinc-900/50 rounded-xl" />
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
                        const isExpanded = expandedMatch === m.match_id;
                        const stats = matchStats[m.match_id];
                        const date = m.finished_at ? new Date(m.finished_at * 1000).toLocaleDateString() : '';

                        return (
                            <div key={m.match_id} className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden">
                                {/* Match row */}
                                <div className="flex items-center gap-3 px-4 py-3">
                                    {/* Score */}
                                    <div className="flex items-center gap-2 min-w-[120px]">
                                        <span className={`font-black text-lg ${winner === 'faction1' ? 'text-emerald-400' : 'text-zinc-400'}`}>{score1}</span>
                                        <span className="text-zinc-600 font-bold">–</span>
                                        <span className={`font-black text-lg ${winner === 'faction2' ? 'text-emerald-400' : 'text-zinc-400'}`}>{score2}</span>
                                    </div>

                                    {/* Teams */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white font-medium truncate">
                                            <span className={winner === 'faction1' ? 'text-emerald-400' : ''}>{f1?.nickname}</span>
                                            <span className="text-zinc-600 mx-2">vs</span>
                                            <span className={winner === 'faction2' ? 'text-emerald-400' : ''}>{f2?.nickname}</span>
                                        </div>
                                        <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{m.match_id}</div>
                                    </div>

                                    {/* Date + expand */}
                                    <div className="text-right flex items-center gap-2 shrink-0">
                                        {date && <span className="text-xs text-zinc-600">{date}</span>}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-zinc-500 hover:text-white"
                                            onClick={() => toggleStats(m.match_id)}
                                        >
                                            {loadingStats === m.match_id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Expanded stats */}
                                {isExpanded && stats && (
                                    <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
                                        {stats.rounds?.[0]?.teams?.map((team: any, ti: number) => (
                                            <div key={ti}>
                                                <div className="text-xs font-bold text-zinc-400 mb-1.5 flex items-center gap-2">
                                                    {team.team_stats?.['Team']}
                                                    <span className="text-orange-400">{team.team_stats?.['Final Score']}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {team.players?.map((p: any, pi: number) => (
                                                        <div key={pi} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 text-xs items-center">
                                                            <span className="text-white font-medium truncate">{p.player_stats?.['Nickname']}</span>
                                                            <span className="text-zinc-400 tabular-nums">{p.player_stats?.['Kills']}/<span className="text-red-400">{p.player_stats?.['Deaths']}</span></span>
                                                            <span className="text-zinc-500 tabular-nums">K/D {p.player_stats?.['K/D Ratio']}</span>
                                                            <span className="text-zinc-500 tabular-nums">HS {p.player_stats?.['Headshots %']}%</span>
                                                            <span className="text-zinc-500 tabular-nums">ADR {p.player_stats?.['ADR'] || '–'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {isExpanded && !stats && loadingStats !== m.match_id && (
                                    <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500 italic">Loading stats...</div>
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
