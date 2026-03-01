import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Activity, User, Swords } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const FaceitTest = () => {
    const [nickname, setNickname] = useState("");
    const [playerId, setPlayerId] = useState("");
    const [playerData, setPlayerData] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [matchStats, setMatchStats] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const callProxy = async (endpoint: string) => {
        const { data, error } = await supabase.functions.invoke('faceit-match-proxy', {
            body: { endpoint },
        });
        if (error) throw new Error(error.message || 'Proxy error');
        if (data?.errors) throw new Error(JSON.stringify(data.errors));
        return data;
    };

    const fetchPlayer = async () => {
        if (!nickname.trim()) return;
        setLoading(true);
        setPlayerData(null);
        setPlayerId('');
        setMatches([]);
        setMatchStats({});
        try {
            const data = await callProxy(`/players?nickname=${encodeURIComponent(nickname.trim())}`);
            setPlayerData(data);
            if (data?.player_id) {
                setPlayerId(data.player_id);
                toast({ title: "Player Found", description: `Faceit ID: ${data.player_id}` });
            } else {
                toast({ title: "Not Found", description: data?.errors?.[0]?.message || "Player not found.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchMatchHistory = async () => {
        if (!playerId) return;
        setLoading(true);
        setMatches([]);
        setMatchStats({});
        try {
            const data = await callProxy(`/players/${playerId}/history?game=cs2&limit=10`);
            const items = data?.items || [];
            setMatches(items);
            if (items.length === 0) {
                toast({ title: "No Matches", description: "No recent CS2 matches found.", variant: "default" });
            } else {
                toast({ title: "History Loaded", description: `Found ${items.length} recent matches.` });
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchMatchStats = async (faceitMatchId: string) => {
        if (matchStats[faceitMatchId]) return;
        try {
            const data = await callProxy(`/matches/${faceitMatchId}/stats`);
            setMatchStats(prev => ({ ...prev, [faceitMatchId]: data }));
        } catch (err: any) {
            toast({ title: "Stats Error", description: err.message, variant: "destructive" });
        }
    };

    return (
        <div className="container mx-auto py-10 space-y-8 max-w-4xl pb-40">
            <div className="space-y-2 text-center md:text-left">
                <h1 className="text-4xl font-bold tracking-tight text-white italic">
                    FACEIT<span className="text-orange-500">TRACKER</span> DEBUG
                </h1>
                <p className="text-zinc-400">CS2 match data integrity testing via Faceit Data API proxy.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player Lookup */}
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                            <User className="w-5 h-5 text-orange-500" /> Player Lookup
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Find Faceit ID by nickname</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs">Faceit Nickname</Label>
                            <Input
                                placeholder="s1mple"
                                value={nickname}
                                onChange={e => setNickname(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && fetchPlayer()}
                                className="bg-zinc-950 border-zinc-800 text-white"
                            />
                        </div>
                        <Button
                            onClick={fetchPlayer}
                            disabled={loading || !nickname.trim()}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                            Identify Player
                        </Button>
                    </CardContent>
                </Card>

                {/* Player ID Banner */}
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                            <Activity className="w-5 h-5 text-zinc-500" /> Active Target
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Fetched Faceit player ID</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {playerId ? (
                            <>
                                <div className="font-mono text-xs text-orange-400 break-all bg-orange-500/5 border border-orange-500/20 p-3 rounded-lg">
                                    {playerId}
                                </div>
                                <Button
                                    onClick={fetchMatchHistory}
                                    disabled={loading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
                                    Fetch CS2 Match History
                                </Button>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-16 text-zinc-600 text-sm italic">
                                Identify a player first
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Player Info */}
            {playerData && !playerData.errors && (
                <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <img
                                src={playerData.avatar || ''}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-orange-500/30"
                                onError={e => (e.currentTarget.style.display = 'none')}
                            />
                            {playerData.nickname}
                            <span className="text-[10px] font-mono text-zinc-500 ml-auto">{playerData.player_id}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs text-zinc-400 overflow-auto max-h-48 font-mono">
                            {JSON.stringify({
                                country: playerData.country,
                                games: playerData.games,
                                faceit_elo: playerData.games?.cs2?.faceit_elo,
                                skill_level: playerData.games?.cs2?.skill_level,
                            }, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}

            {/* Match History */}
            {(loading && matches.length === 0) ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full bg-zinc-900/50 border border-zinc-800 rounded-xl" />
                ))
            ) : matches.length > 0 ? (
                <div className="space-y-3">
                    <h2 className="text-xl font-bold text-white italic">
                        CS2 <span className="text-zinc-500 not-italic uppercase tracking-widest text-sm">MATCHES</span>
                    </h2>
                    {matches.map((m: any) => (
                        <div key={m.match_id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-mono text-xs text-zinc-500">{m.match_id}</div>
                                    <div className="text-sm text-white font-bold mt-1">
                                        {m.teams?.faction1?.nickname} vs {m.teams?.faction2?.nickname}
                                    </div>
                                    <div className="text-xs text-zinc-400">
                                        {m.results?.score?.faction1} – {m.results?.score?.faction2}
                                        {m.results?.winner && (
                                            <span className="ml-2 text-emerald-400 font-bold">
                                                {m.results.winner === 'faction1' ? m.teams?.faction1?.nickname : m.teams?.faction2?.nickname} wins
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fetchMatchStats(m.match_id)}
                                    className="border-zinc-700 text-zinc-300 hover:text-white text-xs"
                                >
                                    <Swords className="w-3.5 h-3.5 mr-1.5" />
                                    Load Stats
                                </Button>
                            </div>

                            {matchStats[m.match_id] && (
                                <div className="mt-2 pt-2 border-t border-zinc-800">
                                    <pre className="text-[10px] text-zinc-500 overflow-auto max-h-40 font-mono">
                                        {JSON.stringify(matchStats[m.match_id]?.rounds?.[0]?.teams?.map((t: any) => ({
                                            name: t.team_stats?.['Team'],
                                            score: t.team_stats?.['Final Score'],
                                            kills: t.players?.map((p: any) => ({
                                                player: p.player_stats?.['Nickname'],
                                                kills: p.player_stats?.['Kills'],
                                                deaths: p.player_stats?.['Deaths'],
                                                kd: p.player_stats?.['K/D Ratio'],
                                                hs: p.player_stats?.['Headshots %'],
                                            }))
                                        })), null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : playerData && !playerData.errors ? (
                <Alert className="bg-zinc-900/50 border-zinc-800">
                    <AlertDescription className="text-zinc-400 text-sm">
                        Fetch match history to see CS2 results.
                    </AlertDescription>
                </Alert>
            ) : null}
        </div>
    );
};

export default FaceitTest;
