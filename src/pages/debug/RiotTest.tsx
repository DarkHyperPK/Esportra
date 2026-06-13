import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Activity, Globe, User, Target as TargetIcon } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import MatchHistoryCard from '@/components/debug/MatchHistoryCard';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';

const RiotTest = () => {
    const [gameName, setGameName] = useState('');
    const [tagLine, setTagLine] = useState('');
    const [region, setRegion] = useState('asia');
    const [puuid, setPuuid] = useState('');
    const [loading, setLoading] = useState(false);
    const [detectingShard, setDetectingShard] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);
    const [matches, setMatches] = useState<EnrichedRiotMatchData[]>([]);
    const { toast } = useToast();

    const resolveValRegion = (routingRegion: string) => {
        if (routingRegion === 'asia') return 'ap';
        if (routingRegion === 'americas') return 'na';
        return 'eu';
    };

    const callProxy = async (endpoint: string, apiRegion: string = region) => {
        try {
            return await apiClient.post<Record<string, unknown>>('/api/integrations/riot/proxy', {
                endpoint,
                region: apiRegion,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Request failed';
            console.error('[riot-proxy] CATCH ERROR:', err);
            return { error: message };
        }
    };

    const fetchEnrichedMatch = async (matchId: string, valRegion: string) => {
        try {
            return await apiClient.post<EnrichedRiotMatchData>('/api/integrations/riot/enriched-match', {
                region: valRegion,
                matchId,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Request failed';
            console.error('[riot-enriched-match] CATCH ERROR:', err);
            return null;
        }
    };

    const detectShard = async (targetPuuid: string) => {
        setDetectingShard(true);
        try {
            const shardData = await callProxy(
                `/riot/account/v1/active-shards/by-game/val/by-puuid/${targetPuuid}`,
            ) as { activeShard?: string };

            if (shardData?.activeShard) {
                const shard = shardData.activeShard.toLowerCase();
                let detectedRegion = 'asia';

                if (['na', 'br', 'latam'].includes(shard)) detectedRegion = 'americas';
                if (['eu'].includes(shard)) detectedRegion = 'europe';
                if (['ap', 'kr'].includes(shard)) detectedRegion = 'asia';

                if (detectedRegion !== region) {
                    setRegion(detectedRegion);
                    toast({
                        title: 'Region Detected',
                        description: `Switched to ${detectedRegion.toUpperCase()} based on account shard: ${shard.toUpperCase()}`,
                    });
                }
            }
        } catch (err) {
            console.error('[shard-detection] Failed:', err);
        } finally {
            setDetectingShard(false);
        }
    };

    const fetchAccount = async () => {
        if (!gameName || !tagLine) return;
        setLoading(true);
        setResult(null);
        setPuuid('');
        setMatches([]);

        const data = await callProxy(
            `/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
            'americas',
        ) as { puuid?: string; error?: string };

        if (data?.puuid) {
            setResult(data);
            setPuuid(data.puuid);
            toast({ title: 'Player Identified', description: 'Found PUUID. Detecting region…' });
            await detectShard(data.puuid);
        } else {
            setResult(data);
            toast({
                title: 'Not Found',
                description: data.error || 'Riot ID not found. Check name and tag.',
                variant: 'destructive',
            });
        }
        setLoading(false);
    };

    const fetchMatchHistory = async () => {
        if (!puuid) return;
        setLoading(true);
        setMatches([]);

        try {
            const valRegion = resolveValRegion(region);
            const listData = await callProxy(
                `/val/match/v1/matchlists/by-puuid/${puuid}`,
                valRegion,
            ) as { history?: Array<{ matchId: string }> };

            if (listData?.history && listData.history.length > 0) {
                const latestMatchIds = listData.history.slice(0, 5).map((entry) => entry.matchId);
                const matchDetails: EnrichedRiotMatchData[] = [];

                for (const matchId of latestMatchIds) {
                    const detail = await fetchEnrichedMatch(matchId, valRegion);
                    if (detail?.matchInfo?.matchId) {
                        matchDetails.push(detail);
                    }
                }

                setMatches(matchDetails);

                if (matchDetails.length === 0) {
                    toast({
                        title: 'Parse Failed',
                        description: 'Fetched match IDs but could not enrich match payloads.',
                        variant: 'destructive',
                    });
                }
            } else {
                toast({
                    title: 'No History',
                    description: 'Could not find any recent matches for this account.',
                });
            }
        } catch (err) {
            console.error(err);
            toast({
                title: 'Fetch Failed',
                description: 'Could not load match history.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-[1280px] space-y-8 px-4 py-8 pb-40 sm:px-6 lg:px-8">
            <div className="space-y-2 text-center md:text-left">
                <h1 className="text-4xl font-bold italic tracking-tight text-white">
                    RIOT<span className="text-rose-600">TRACKER</span> DEBUG
                </h1>
                <p className="text-zinc-400">
                    Production environment for full MatchDto parsing and analytics verification.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                            <User className="h-5 w-5 text-rose-500" /> Account Identity
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Find PUUID and detect Region</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400">Game Name</Label>
                                <Input
                                    placeholder="TenZ"
                                    value={gameName}
                                    onChange={(e) => setGameName(e.target.value)}
                                    className="border-zinc-800 bg-zinc-950 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400">Tag Line</Label>
                                <Input
                                    placeholder="001"
                                    value={tagLine}
                                    onChange={(e) => setTagLine(e.target.value)}
                                    className="border-zinc-800 bg-zinc-950 text-white"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={fetchAccount}
                            disabled={loading || detectingShard || !gameName || !tagLine}
                            className="w-full bg-rose-600 font-bold text-white hover:bg-rose-700"
                        >
                            {loading || detectingShard ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Search className="mr-2 h-4 w-4" />
                            )}
                            {detectingShard ? 'Detecting Region…' : 'Identify Player'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                            <Globe className="h-5 w-5 text-zinc-500" /> Region Selector
                        </CardTitle>
                        <CardDescription className="text-zinc-500">
                            Select cluster manually if auto-detect fails
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Routing Region</Label>
                            <select
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm text-white outline-none focus:ring-1 focus:ring-rose-500"
                            >
                                <option value="asia">Asia / Pacific (AP)</option>
                                <option value="americas">Americas (NA/BR/LATAM)</option>
                                <option value="europe">Europe (EU)</option>
                            </select>
                        </div>
                        <div className="pt-2">
                            <Alert className="border-rose-500/20 bg-rose-500/10 py-2">
                                <AlertDescription className="text-[10px] font-black uppercase text-rose-400">
                                    Enriched fetch: round timeline, economy, weapons, ability casts
                                </AlertDescription>
                            </Alert>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {puuid ? (
                <div className="flex animate-in fade-in slide-in-from-top-2 items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/20">
                            <TargetIcon className="h-6 w-6 text-rose-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                                Active Target PUUID
                                <span className="rounded bg-emerald-500/10 px-1 text-[8px] font-black text-emerald-500">
                                    {region.toUpperCase()} ROUTING
                                </span>
                            </div>
                            <div className="font-mono text-sm text-white">{puuid}</div>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={fetchMatchHistory}
                        disabled={loading}
                        className="bg-emerald-600 font-bold hover:bg-emerald-700"
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Activity className="mr-2 h-4 w-4" />
                        )}
                        Fetch Enriched Match History
                    </Button>
                </div>
            ) : null}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-xl font-bold italic text-white">
                        LATEST{' '}
                        <span className="text-sm font-normal uppercase tracking-widest text-zinc-500 not-italic">
                            MATCHES
                        </span>
                    </h2>
                    {(matches.length > 0 || result) ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setMatches([]);
                                setResult(null);
                                setPuuid('');
                            }}
                            className="text-zinc-500 hover:text-white"
                        >
                            Reset
                        </Button>
                    ) : null}
                </div>

                <div className="grid gap-3">
                    {loading && matches.length === 0 ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-24 w-full rounded-xl border border-zinc-800 bg-zinc-900/50"
                            />
                        ))
                    ) : matches.length > 0 ? (
                        matches.map((match) => (
                            <MatchHistoryCard
                                key={match.matchInfo.matchId}
                                matchData={match}
                                targetPuuid={puuid}
                            />
                        ))
                    ) : result?.error ? (
                        <Alert variant="destructive" className="border-rose-500/20 bg-rose-500/10">
                            <AlertDescription className="overflow-auto font-mono text-xs">
                                {JSON.stringify(result, null, 2)}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="group flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/10 backdrop-blur-sm">
                            <div className="relative mb-4">
                                <Activity className="h-12 w-12 opacity-10 transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-rose-500/5 blur-xl transition-colors group-hover:bg-rose-500/10" />
                            </div>
                            <p className="text-sm font-medium text-zinc-600">No account data active</p>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800">
                                Identify a player to begin sequence
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RiotTest;
