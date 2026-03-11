import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Activity, Globe, User, Target as TargetIcon } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import MatchHistoryCard from '@/components/debug/MatchHistoryCard';

const RiotTest = () => {
    const [gameName, setGameName] = useState("");
    const [tagLine, setTagLine] = useState("");
    const [region, setRegion] = useState("asia"); // Initial guess, will be auto-updated
    const [puuid, setPuuid] = useState("");
    const [loading, setLoading] = useState(false);
    const [detectingShard, setDetectingShard] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const { toast } = useToast();

    const callProxy = async (endpoint: string, apiRegion: string = region) => {
        try {
            return await apiClient.post<any>('/api/integrations/riot/proxy', { endpoint, region: apiRegion });
        } catch (err: any) {
            console.error("[riot-proxy] CATCH ERROR:", err);
            return { error: err.message };
        }
    };

    const detectShard = async (targetPuuid: string) => {
        setDetectingShard(true);
        try {
            // Shard lookup usually works best on the 'americas' or 'europe' cluster if unknown,
            // but Riot IDs are global. We'll try the current region first.
            const shardData = await callProxy(`/riot/account/v1/active-shards/by-game/val/by-puuid/${targetPuuid}`);

            if (shardData?.activeShard) {
                const shard = shardData.activeShard.toLowerCase();
                let detectedRegion = "asia";

                if (["na", "br", "latam"].includes(shard)) detectedRegion = "americas";
                if (["eu"].includes(shard)) detectedRegion = "europe";
                if (["ap", "kr"].includes(shard)) detectedRegion = "asia";

                if (detectedRegion !== region) {
                    setRegion(detectedRegion);
                    toast({
                        title: "Region Detected",
                        description: `Switched to ${detectedRegion.toUpperCase()} based on account shard: ${shard.toUpperCase()}`,
                    });
                }
            }
        } catch (err) {
            console.error("[shard-detection] Failed:", err);
        } finally {
            setDetectingShard(false);
        }
    };

    const fetchAccount = async () => {
        if (!gameName || !tagLine) return;
        setLoading(true);
        setResult(null);
        setPuuid("");
        setMatches([]);

        // Try finding the account (Global)
        const data = await callProxy(`/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`, "americas");

        if (data?.puuid) {
            setResult(data);
            setPuuid(data.puuid);
            toast({ title: "Player Identified", description: `Found PUUID. Detecting region...` });
            // Automatically detect shard and switch region
            await detectShard(data.puuid);
        } else {
            setResult(data);
            toast({
                title: "Not Found",
                description: data.error || "Riot ID not found. Check name and tag.",
                variant: "destructive"
            });
        }
        setLoading(false);
    };

    const fetchMatchHistory = async () => {
        if (!puuid) return;
        setLoading(true);
        setMatches([]);

        try {
            const valRegion = region === 'asia' ? 'ap' : region === 'americas' ? 'na' : 'eu';
            const listData = await callProxy(`/val/match/v1/matchlists/by-puuid/${puuid}`, valRegion);

            if (listData?.history && listData.history.length > 0) {
                const latestMatchIds = listData.history.slice(0, 5).map((m: any) => m.matchId);

                const matchDetails: any[] = [];
                for (const mId of latestMatchIds) {
                    const detail = await callProxy(`/val/match/v1/matches/${mId}`, valRegion);
                    if (detail && !detail.error) matchDetails.push(detail);
                }
                setMatches(matchDetails);
            } else {
                toast({
                    title: "No History",
                    description: "Could not find any recent matches for this account.",
                    variant: "default"
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 space-y-8 max-w-4xl pb-40">
            <div className="space-y-2 text-center md:text-left">
                <h1 className="text-4xl font-bold tracking-tight text-white italic">RIOT<span className="text-rose-600">TRACKER</span> DEBUG</h1>
                <p className="text-zinc-400">Production environment for match data integrity testing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Lookup */}
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                            <User className="w-5 h-5 text-rose-500" /> Account Identity
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Find PUUID and detect Region</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs text-xs">Game Name</Label>
                                <Input
                                    placeholder="TenZ"
                                    value={gameName}
                                    onChange={e => setGameName(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs text-xs">Tag Line</Label>
                                <Input
                                    placeholder="001"
                                    value={tagLine}
                                    onChange={e => setTagLine(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 text-white"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={fetchAccount}
                            disabled={loading || detectingShard || !gameName || !tagLine}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold"
                        >
                            {loading || detectingShard ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                            {detectingShard ? "Detecting Region..." : "Identify Player"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Global Configuration */}
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                            <Globe className="w-5 h-5 text-zinc-500" /> Region Selector
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Select cluster manually if auto-detect fails</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs text-xs">Routing Region</Label>
                            <select
                                value={region}
                                onChange={e => setRegion(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:ring-1 focus:ring-rose-500 outline-none"
                            >
                                <option value="asia">Asia / Pacific (AP)</option>
                                <option value="americas">Americas (NA/BR/LATAM)</option>
                                <option value="europe">Europe (EU)</option>
                            </select>
                        </div>
                        <div className="pt-2">
                            <Alert className="bg-rose-500/10 border-rose-500/20 py-2">
                                <AlertDescription className="text-[10px] text-rose-400 uppercase font-black">
                                    Current Key: Production Tier
                                </AlertDescription>
                            </Alert>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PUUID Banner */}
            {puuid && (
                <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex items-center justify-between backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-500/20 flex items-center justify-center rounded-lg border border-rose-500/30">
                            <TargetIcon className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                Active Target PUUID
                                <span className="text-emerald-500 bg-emerald-500/10 px-1 rounded text-[8px] font-black">
                                    {region.toUpperCase()} ROUTING
                                </span>
                            </div>
                            <div className="text-sm font-mono text-white">{puuid}</div>
                        </div>
                    </div>
                    <Button size="sm" onClick={fetchMatchHistory} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
                        Fetch Match History
                    </Button>
                </div>
            )}

            {/* Results Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 italic">
                        LATEST <span className="text-zinc-500 not-italic uppercase tracking-widest text-sm">MATCHES</span>
                    </h2>
                    {(matches.length > 0 || result) && (
                        <Button variant="ghost" size="sm" onClick={() => { setMatches([]); setResult(null); setPuuid(""); }} className="text-zinc-500 hover:text-white">
                            Reset
                        </Button>
                    )}
                </div>

                <div className="grid gap-3">
                    {loading && matches.length === 0 ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full bg-zinc-900/50 border border-zinc-800 rounded-xl" />
                        ))
                    ) : matches.length > 0 ? (
                        matches.map((m, i) => (
                            <MatchHistoryCard key={m.matchInfo.matchId} matchData={m} targetPuuid={puuid} />
                        ))
                    ) : result?.error ? (
                        <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20">
                            <AlertDescription className="font-mono text-xs overflow-auto">
                                {JSON.stringify(result, null, 2)}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl text-zinc-700 bg-zinc-900/10 backdrop-blur-sm group">
                            <div className="relative mb-4">
                                <Activity className="w-12 h-12 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-rose-500/5 blur-xl group-hover:bg-rose-500/10 transition-colors" />
                            </div>
                            <p className="text-sm font-medium text-zinc-600">No account data active</p>
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] mt-2 text-zinc-800">Identify a player to begin sequence</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default RiotTest;
