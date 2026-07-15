import React, { useState } from 'react';
import { Button, CtaButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Activity, Globe, User, Target as TargetIcon, MonitorUp, Eye, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import MatchHistoryCard from '@/components/debug/MatchHistoryCard';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';

const OBS_PREVIEW_WIDTH = 1600;
const OBS_PREVIEW_HEIGHT = 900;
const SPONSOR_CANVAS_WIDTH = 250;
const SPONSOR_CANVAS_HEIGHT = 340;
const OVERLAY_THEMES = [
    { value: 'tactical', label: 'Tactical Neon' },
    { value: 'premium', label: 'Premium Minimal' },
    { value: 'glitch', label: 'Glitch Arena' },
] as const;
type OverlayTheme = typeof OVERLAY_THEMES[number]['value'];

const OverlayPreviewFrame = ({
    src,
    refreshKey,
    title,
    emptyLabel,
}: {
    src: string;
    refreshKey: number;
    title: string;
    emptyLabel: string;
}) => {
    const frameRef = React.useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = React.useState(0);

    React.useEffect(() => {
        const element = frameRef.current;
        if (!element) return;

        const update = () => setScale(element.clientWidth / OBS_PREVIEW_WIDTH);
        update();

        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={frameRef} className="relative aspect-video w-full overflow-hidden border border-zinc-800 bg-black">
            {src ? (
                <div
                    className="absolute left-0 top-0"
                    style={{
                        width: OBS_PREVIEW_WIDTH,
                        height: OBS_PREVIEW_HEIGHT,
                        transform: `scale(${scale || 0.001})`,
                        transformOrigin: 'top left',
                    }}
                >
                    <iframe
                        key={`${src}-${refreshKey}`}
                        src={src}
                        title={title}
                        className="h-full w-full border-0"
                        loading="eager"
                    />
                </div>
            ) : (
                <div className="grid h-full place-items-center text-center text-xs font-black uppercase tracking-[0.2em] text-zinc-700">
                    {emptyLabel}
                </div>
            )}
        </div>
    );
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const SponsorPlacementEditor = ({
    image,
    label,
    panelColor,
    textColor,
    width,
    height,
    offsetX,
    offsetY,
    fit,
    onWidthChange,
    onHeightChange,
    onOffsetXChange,
    onOffsetYChange,
}: {
    image: string;
    label: string;
    panelColor: string;
    textColor: string;
    width: string;
    height: string;
    offsetX: string;
    offsetY: string;
    fit: string;
    onWidthChange: (value: string) => void;
    onHeightChange: (value: string) => void;
    onOffsetXChange: (value: string) => void;
    onOffsetYChange: (value: string) => void;
}) => {
    const canvasRef = React.useRef<HTMLDivElement | null>(null);
    const dragRef = React.useRef<{
        mode: "move" | "resize";
        startClientX: number;
        startClientY: number;
        startWidth: number;
        startHeight: number;
        startX: number;
        startY: number;
    } | null>(null);

    const boxWidth = clampValue(Number(width) || 210, 40, SPONSOR_CANVAS_WIDTH);
    const boxHeight = clampValue(Number(height) || 170, 40, SPONSOR_CANVAS_HEIGHT);
    const maxX = (SPONSOR_CANVAS_WIDTH - boxWidth) / 2;
    const maxY = (SPONSOR_CANVAS_HEIGHT - boxHeight) / 2;
    const boxX = clampValue(Number(offsetX) || 0, -maxX, maxX);
    const boxY = clampValue(Number(offsetY) || 0, -maxY, maxY);

    React.useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            const active = dragRef.current;
            const canvas = canvasRef.current;
            if (!active || !canvas) return;

            const rect = canvas.getBoundingClientRect();
            const scale = rect.width / SPONSOR_CANVAS_WIDTH || 1;
            const deltaX = (event.clientX - active.startClientX) / scale;
            const deltaY = (event.clientY - active.startClientY) / scale;

            if (active.mode === "resize") {
                const nextWidth = clampValue(active.startWidth + deltaX, 40, SPONSOR_CANVAS_WIDTH);
                const nextHeight = clampValue(active.startHeight + deltaY, 40, SPONSOR_CANVAS_HEIGHT);
                const nextMaxX = (SPONSOR_CANVAS_WIDTH - nextWidth) / 2;
                const nextMaxY = (SPONSOR_CANVAS_HEIGHT - nextHeight) / 2;
                onWidthChange(String(Math.round(nextWidth)));
                onHeightChange(String(Math.round(nextHeight)));
                onOffsetXChange(String(Math.round(clampValue(active.startX, -nextMaxX, nextMaxX))));
                onOffsetYChange(String(Math.round(clampValue(active.startY, -nextMaxY, nextMaxY))));
                return;
            }

            onOffsetXChange(String(Math.round(clampValue(active.startX + deltaX, -maxX, maxX))));
            onOffsetYChange(String(Math.round(clampValue(active.startY + deltaY, -maxY, maxY))));
        };

        const handlePointerUp = () => {
            dragRef.current = null;
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [maxX, maxY, onHeightChange, onOffsetXChange, onOffsetYChange, onWidthChange]);

    const beginDrag = (event: React.PointerEvent, mode: "move" | "resize") => {
        event.preventDefault();
        dragRef.current = {
            mode,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startWidth: boxWidth,
            startHeight: boxHeight,
            startX: boxX,
            startY: boxY,
        };
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Ad width</Label>
                    <Input
                        type="number"
                        min="40"
                        max={SPONSOR_CANVAS_WIDTH}
                        value={width}
                        onChange={(event) => onWidthChange(event.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Ad height</Label>
                    <Input
                        type="number"
                        min="40"
                        max={SPONSOR_CANVAS_HEIGHT}
                        value={height}
                        onChange={(event) => onHeightChange(event.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Ad X offset</Label>
                    <Input
                        type="number"
                        value={offsetX}
                        onChange={(event) => onOffsetXChange(event.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Ad Y offset</Label>
                    <Input
                        type="number"
                        value={offsetY}
                        onChange={(event) => onOffsetYChange(event.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-white"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-zinc-400">Manual ad canvas</Label>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">Drag / resize</span>
                </div>
                <div
                    ref={canvasRef}
                    className="relative aspect-[25/34] w-full overflow-hidden border border-zinc-800 bg-zinc-950"
                    style={{ backgroundColor: image ? "rgba(9,9,11,0.92)" : panelColor, color: textColor }}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[length:25px_34px]" />
                    <div
                        className="absolute cursor-move border border-dashed border-white/80 bg-white/5 shadow-[0_0_0_999px_rgba(0,0,0,.18)]"
                        onPointerDown={(event) => beginDrag(event, "move")}
                        style={{
                            left: `calc(50% + ${boxX}px)`,
                            top: `calc(50% + ${boxY}px)`,
                            width: boxWidth,
                            height: boxHeight,
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        {image ? (
                            <img
                                src={image}
                                alt=""
                                className="h-full w-full select-none"
                                draggable={false}
                                style={{ objectFit: fit === "cover" ? "cover" : "contain" }}
                            />
                        ) : (
                            <div className="grid h-full place-items-center px-3 text-center text-sm font-black uppercase leading-tight opacity-70">
                                {label || "Sponsor"}
                            </div>
                        )}
                        <button
                            type="button"
                            aria-label="Resize sponsor ad"
                            className="absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize border border-white bg-rose-600"
                            onPointerDown={(event) => beginDrag(event, "resize")}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const RiotTest = () => {
    const [gameName, setGameName] = useState('');
    const [tagLine, setTagLine] = useState('');
    const [region, setRegion] = useState('asia');
    const [puuid, setPuuid] = useState('');
    const [loading, setLoading] = useState(false);
    const [detectingShard, setDetectingShard] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);
    const [matches, setMatches] = useState<EnrichedRiotMatchData[]>([]);
    const [teamAAlias, setTeamAAlias] = useState('Team A');
    const [teamBAlias, setTeamBAlias] = useState('Team B');
    const [teamALogoUrl, setTeamALogoUrl] = useState('');
    const [teamBLogoUrl, setTeamBLogoUrl] = useState('');
    const [sponsorImageUrl, setSponsorImageUrl] = useState('');
    const [sponsorLabel, setSponsorLabel] = useState('Sponsor');
    const [sponsorWidth, setSponsorWidth] = useState('210');
    const [sponsorHeight, setSponsorHeight] = useState('170');
    const [sponsorOffsetX, setSponsorOffsetX] = useState('0');
    const [sponsorOffsetY, setSponsorOffsetY] = useState('0');
    const [sponsorFit, setSponsorFit] = useState('contain');
    const [overlayType, setOverlayType] = useState<'match' | 'player' | 'compare'>('match');
    const [overlayTheme, setOverlayTheme] = useState<OverlayTheme>('tactical');
    const [selectedPlayerPuuid, setSelectedPlayerPuuid] = useState('');
    const [selectedLeftPlayerPuuid, setSelectedLeftPlayerPuuid] = useState('');
    const [selectedRightPlayerPuuid, setSelectedRightPlayerPuuid] = useState('');
    const [teamAColor, setTeamAColor] = useState('#4c1d83');
    const [teamBColor, setTeamBColor] = useState('#cf69da');
    const [accentColor, setAccentColor] = useState('#ef151c');
    const [bgDim, setBgDim] = useState('0.72');
    const [leftSide, setLeftSide] = useState('winner');
    const [nameMode, setNameMode] = useState('full');
    const [overlayTransition, setOverlayTransition] = useState('none');
    const [mvpLabel, setMvpLabel] = useState('MVP');
    const [mapNameOverride, setMapNameOverride] = useState('');
    const [showMap, setShowMap] = useState(true);
    const [showLogos, setShowLogos] = useState(true);
    const [showPortraits, setShowPortraits] = useState(true);
    const [showMvpBadges, setShowMvpBadges] = useState(true);
    const [showRows, setShowRows] = useState(true);
    const [showKda, setShowKda] = useState(true);
    const [showAcs, setShowAcs] = useState(true);
    const [showKdRatio, setShowKdRatio] = useState(true);
    const [showAdr, setShowAdr] = useState(true);
    const [showHs, setShowHs] = useState(true);
    const [showFb, setShowFb] = useState(true);
    const [showAbilityCasts, setShowAbilityCasts] = useState(true);
    const [highlightLeader, setHighlightLeader] = useState(true);
    const [showDelta, setShowDelta] = useState(true);
    const [showTeamContext, setShowTeamContext] = useState(true);
    const [playerTitle, setPlayerTitle] = useState('Player Stats');
    const [playerSubtitle, setPlayerSubtitle] = useState('Match Performance');
    const [previewMatchId, setPreviewMatchId] = useState('');
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
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
            const _message = err instanceof Error ? err.message : 'Request failed';
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
        setPreviewMatchId('');

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
        setPreviewMatchId('');

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
                setPreviewMatchId(matchDetails[0]?.matchInfo.matchId || '');

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

    const getPlayerOptions = (match: EnrichedRiotMatchData) =>
        [...match.players]
            .sort((left, right) => {
                const leftAcs = Math.round(left.stats.score / Math.max(1, left.stats.roundsPlayed ?? 1));
                const rightAcs = Math.round(right.stats.score / Math.max(1, right.stats.roundsPlayed ?? 1));
                return rightAcs - leftAcs || right.stats.kills - left.stats.kills;
            })
            .map((player) => ({
                puuid: player.puuid,
                label: `${player.gameName || 'Unknown'}${player.tagLine ? `#${player.tagLine}` : ''} · ${player.teamId}`,
            }));

    const buildOverlayUrl = (match: EnrichedRiotMatchData, themeOverride: OverlayTheme = overlayTheme) => {
        const matchId = match.matchInfo.matchId;
        if (!matchId) return '';
        const playerOptions = getPlayerOptions(match);
        const fallbackPlayer = playerOptions[0]?.puuid || '';
        const fallbackCompareRight = playerOptions.find((player) => player.puuid !== (selectedLeftPlayerPuuid || fallbackPlayer))?.puuid || fallbackPlayer;
        const params = new URLSearchParams({
            region: resolveValRegion(region),
            matchId,
            teamA: teamAAlias.trim() || 'Team A',
            teamB: teamBAlias.trim() || 'Team B',
            teamAColor,
            teamBColor,
            accentColor,
            bgDim,
            leftSide,
            nameMode,
            theme: themeOverride,
            transition: overlayTransition,
            sponsorSize: '1',
            sponsorWidth,
            sponsorHeight,
            sponsorX: sponsorOffsetX,
            sponsorY: sponsorOffsetY,
            sponsorFit,
            mvpLabel: mvpLabel.trim() || 'MVP',
            showMap: showMap ? '1' : '0',
            showLogos: showLogos ? '1' : '0',
            showPortraits: showPortraits ? '1' : '0',
            showMvpBadges: showMvpBadges ? '1' : '0',
            showRows: showRows ? '1' : '0',
            showKda: showKda ? '1' : '0',
            showAcs: showAcs ? '1' : '0',
            showKdRatio: showKdRatio ? '1' : '0',
            showAdr: showAdr ? '1' : '0',
            showHs: showHs ? '1' : '0',
            showFb: showFb ? '1' : '0',
            showAbilityCasts: showAbilityCasts ? '1' : '0',
            highlightLeader: highlightLeader ? '1' : '0',
            showDelta: showDelta ? '1' : '0',
            showTeamContext: showTeamContext ? '1' : '0',
            title: playerTitle.trim() || 'Player Stats',
            subtitle: playerSubtitle.trim() || 'Match Performance',
        });
        if (overlayType === 'player') {
            params.set('playerPuuid', selectedPlayerPuuid || fallbackPlayer);
        }
        if (overlayType === 'compare') {
            params.set('leftPlayerPuuid', selectedLeftPlayerPuuid || fallbackPlayer);
            params.set('rightPlayerPuuid', selectedRightPlayerPuuid || fallbackCompareRight);
        }
        if (teamALogoUrl.trim()) params.set('teamALogo', teamALogoUrl.trim());
        if (teamBLogoUrl.trim()) params.set('teamBLogo', teamBLogoUrl.trim());
        if (sponsorImageUrl.trim()) params.set('sponsorImage', sponsorImageUrl.trim());
        if (sponsorLabel.trim()) params.set('sponsorLabel', sponsorLabel.trim());
        if (mapNameOverride.trim()) params.set('mapName', mapNameOverride.trim());
        const route = overlayType === 'match' ? '/debug/riot/overlay/match' : `/debug/riot/overlay/${overlayType}`;
        return `${window.location.origin}${route}?${params.toString()}`;
    };

    const copyOverlayUrl = async (match: EnrichedRiotMatchData) => {
        const url = buildOverlayUrl(match);
        if (!url) {
            toast({ title: 'Missing match ID', description: 'This match cannot generate an overlay URL.', variant: 'destructive' });
            return;
        }
        await navigator.clipboard.writeText(url);
        toast({ title: 'OBS overlay link copied' });
    };

    const overlayToggles = [
        { label: 'Map card', checked: showMap, setChecked: setShowMap },
        { label: 'Logo panels', checked: showLogos, setChecked: setShowLogos },
        { label: 'MVP portraits', checked: showPortraits, setChecked: setShowPortraits },
        { label: 'MVP badges', checked: showMvpBadges, setChecked: setShowMvpBadges },
        { label: 'Player rows', checked: showRows, setChecked: setShowRows },
    ];

    const statToggles = [
        { label: 'KDA', checked: showKda, setChecked: setShowKda },
        { label: 'ACS', checked: showAcs, setChecked: setShowAcs },
        { label: 'K/D ratio', checked: showKdRatio, setChecked: setShowKdRatio },
        { label: 'ADR', checked: showAdr, setChecked: setShowAdr },
        { label: 'HS%', checked: showHs, setChecked: setShowHs },
        { label: 'First bloods', checked: showFb, setChecked: setShowFb },
        { label: 'Ability casts', checked: showAbilityCasts, setChecked: setShowAbilityCasts },
        { label: 'Highlight leader', checked: highlightLeader, setChecked: setHighlightLeader },
        { label: 'Show delta', checked: showDelta, setChecked: setShowDelta },
        { label: 'Team context', checked: showTeamContext, setChecked: setShowTeamContext },
    ];
    const previewMatch = matches.find((match) => match.matchInfo.matchId === previewMatchId) || matches[0] || null;
    const previewUrl = previewMatch ? buildOverlayUrl(previewMatch) : '';
    const previewVariantUrls = previewMatch
        ? OVERLAY_THEMES.map((theme) => ({ ...theme, url: buildOverlayUrl(previewMatch, theme.value) }))
        : [];

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

            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <MonitorUp className="h-5 w-5 text-violet-400" /> OBS Overlay Suite
                    </CardTitle>
                    <CardDescription className="text-zinc-500">
                        Generate match, player, and comparison overlay links for OBS.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Overlay type</Label>
                            <select
                                value={overlayType}
                                onChange={(e) => setOverlayType(e.target.value as 'match' | 'player' | 'compare')}
                                className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-rose-500"
                            >
                                <option value="match">Match stats</option>
                                <option value="player">Individual player</option>
                                <option value="compare">Player comparison</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Graphics variant</Label>
                            <select
                                value={overlayTheme}
                                onChange={(e) => setOverlayTheme(e.target.value as OverlayTheme)}
                                className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-rose-500"
                            >
                                {OVERLAY_THEMES.map((theme) => (
                                    <option key={theme.value} value={theme.value}>{theme.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Player overlay title</Label>
                            <Input
                                value={playerTitle}
                                onChange={(e) => setPlayerTitle(e.target.value)}
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Player overlay subtitle</Label>
                            <Input
                                value={playerSubtitle}
                                onChange={(e) => setPlayerSubtitle(e.target.value)}
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Left team alias</Label>
                            <Input
                                value={teamAAlias}
                                onChange={(e) => setTeamAAlias(e.target.value)}
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Left logo URL</Label>
                            <Input
                                value={teamALogoUrl}
                                onChange={(e) => setTeamALogoUrl(e.target.value)}
                                placeholder="https://..."
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Right team alias</Label>
                            <Input
                                value={teamBAlias}
                                onChange={(e) => setTeamBAlias(e.target.value)}
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Right logo URL</Label>
                            <Input
                                value={teamBLogoUrl}
                                onChange={(e) => setTeamBLogoUrl(e.target.value)}
                                placeholder="https://..."
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Sponsor image / GIF URL</Label>
                            <Input
                                value={sponsorImageUrl}
                                onChange={(e) => setSponsorImageUrl(e.target.value)}
                                placeholder="https://... PNG, WebP, GIF"
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                                Animated GIFs are supported in preview and OBS.
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Sponsor fit</Label>
                            <select
                                value={sponsorFit}
                                onChange={(e) => setSponsorFit(e.target.value)}
                                className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-rose-500"
                            >
                                <option value="contain">Contain - no crop</option>
                                <option value="cover">Cover - fill box</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Sponsor placeholder text</Label>
                            <Input
                                value={sponsorLabel}
                                onChange={(e) => setSponsorLabel(e.target.value)}
                                placeholder="Sponsor"
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                    </div>

                    <SponsorPlacementEditor
                        image={sponsorImageUrl}
                        label={sponsorLabel}
                        panelColor={teamBColor}
                        textColor="#ffffff"
                        width={sponsorWidth}
                        height={sponsorHeight}
                        offsetX={sponsorOffsetX}
                        offsetY={sponsorOffsetY}
                        fit={sponsorFit}
                        onWidthChange={setSponsorWidth}
                        onHeightChange={setSponsorHeight}
                        onOffsetXChange={setSponsorOffsetX}
                        onOffsetYChange={setSponsorOffsetY}
                    />

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Left color</Label>
                            <Input
                                type="color"
                                value={teamAColor}
                                onChange={(e) => setTeamAColor(e.target.value)}
                                className="h-10 border-zinc-800 bg-zinc-950 p-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Right color</Label>
                            <Input
                                type="color"
                                value={teamBColor}
                                onChange={(e) => setTeamBColor(e.target.value)}
                                className="h-10 border-zinc-800 bg-zinc-950 p-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">MVP badge color</Label>
                            <Input
                                type="color"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="h-10 border-zinc-800 bg-zinc-950 p-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Background dim</Label>
                            <Input
                                type="number"
                                min="0.35"
                                max="0.9"
                                step="0.05"
                                value={bgDim}
                                onChange={(e) => setBgDim(e.target.value)}
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Left side</Label>
                            <select
                                value={leftSide}
                                onChange={(e) => setLeftSide(e.target.value)}
                                className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-rose-500"
                            >
                                <option value="winner">Winner</option>
                                <option value="loser">Loser</option>
                                <option value="blue">Riot blue</option>
                                <option value="red">Riot red</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Team name style</Label>
                            <select
                                value={nameMode}
                                onChange={(e) => setNameMode(e.target.value)}
                                className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-rose-500"
                            >
                                <option value="short">Short code</option>
                                <option value="full">Full alias</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Entrance animation</Label>
                            <select
                                value={overlayTransition}
                                onChange={(e) => setOverlayTransition(e.target.value)}
                                className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-rose-500"
                            >
                                <option value="none">None</option>
                                <option value="up">Slide up</option>
                                <option value="left">Slide from left</option>
                                <option value="right">Slide from right</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">MVP label</Label>
                            <Input
                                value={mvpLabel}
                                onChange={(e) => setMvpLabel(e.target.value)}
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Map name override</Label>
                            <Input
                                value={mapNameOverride}
                                onChange={(e) => setMapNameOverride(e.target.value)}
                                placeholder="Leave blank for Riot map"
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {overlayToggles.map((option) => (
                            <label
                                key={option.label}
                                className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-300"
                            >
                                <input
                                    type="checkbox"
                                    checked={option.checked}
                                    onChange={(e) => option.setChecked(e.target.checked)}
                                    className="h-4 w-4 accent-rose-600"
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {statToggles.map((option) => (
                            <label
                                key={option.label}
                                className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-300"
                            >
                                <input
                                    type="checkbox"
                                    checked={option.checked}
                                    onChange={(e) => option.setChecked(e.target.checked)}
                                    className="h-4 w-4 accent-rose-600"
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>

                    <div className="space-y-3 border border-zinc-800 bg-zinc-950/70 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Live OBS Preview</div>
                                <div className="mt-1 max-w-full truncate font-mono text-[10px] text-zinc-600">
                                    {previewUrl || 'Fetch enriched match history to preview an overlay.'}
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!previewUrl}
                                onClick={() => setPreviewRefreshKey((key) => key + 1)}
                                className="shrink-0 gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Refresh preview
                            </Button>
                        </div>
                        <OverlayPreviewFrame
                            src={previewUrl}
                            refreshKey={previewRefreshKey}
                            title="Riot OBS overlay preview"
                            emptyLabel="No overlay selected"
                        />
                        {previewVariantUrls.length > 0 && (
                            <div className="grid gap-2 lg:grid-cols-3">
                                {previewVariantUrls.map((theme) => (
                                    <button
                                        key={theme.value}
                                        type="button"
                                        onClick={() => setOverlayTheme(theme.value)}
                                        className={`space-y-1 border p-1 text-left transition ${overlayTheme === theme.value ? 'border-violet-400/70 bg-violet-400/10' : 'border-zinc-800 bg-black/35 hover:border-zinc-600'}`}
                                    >
                                        <div className="px-1 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">{theme.label}</div>
                                        <OverlayPreviewFrame
                                            src={theme.url}
                                            refreshKey={previewRefreshKey}
                                            title={`${theme.label} Riot OBS preview`}
                                            emptyLabel="No overlay selected"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

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
                                setPreviewMatchId('');
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
                        matches.map((match) => {
                            const playerOptions = getPlayerOptions(match);
                            return (
                                <div key={match.matchInfo.matchId} className="space-y-2">
                                    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 lg:flex-row lg:items-end lg:justify-between">
                                        <div className="grid flex-1 gap-2 md:grid-cols-2">
                                            {overlayType === 'player' ? (
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Player</Label>
                                                    <select
                                                        value={selectedPlayerPuuid}
                                                        onChange={(e) => setSelectedPlayerPuuid(e.target.value)}
                                                        className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none focus:ring-1 focus:ring-rose-500"
                                                    >
                                                        <option value="">Auto top player</option>
                                                        {playerOptions.map((player) => (
                                                            <option key={player.puuid} value={player.puuid}>{player.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : null}
                                            {overlayType === 'compare' ? (
                                                <>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Left player</Label>
                                                        <select
                                                            value={selectedLeftPlayerPuuid}
                                                            onChange={(e) => setSelectedLeftPlayerPuuid(e.target.value)}
                                                            className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none focus:ring-1 focus:ring-rose-500"
                                                        >
                                                            <option value="">Auto top player</option>
                                                            {playerOptions.map((player) => (
                                                                <option key={player.puuid} value={player.puuid}>{player.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Right player</Label>
                                                        <select
                                                            value={selectedRightPlayerPuuid}
                                                            onChange={(e) => setSelectedRightPlayerPuuid(e.target.value)}
                                                            className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none focus:ring-1 focus:ring-rose-500"
                                                        >
                                                            <option value="">Auto second player</option>
                                                            {playerOptions.map((player) => (
                                                                <option key={player.puuid} value={player.puuid}>{player.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </>
                                            ) : null}
                                        </div>
                                        <CtaButton
                                            type="button"
                                            size="sm"
                                            onClick={() => copyOverlayUrl(match)}
                                            className="font-bold"
                                        >
                                            <MonitorUp className="mr-2 h-4 w-4" />
                                            Copy {overlayType} OBS Link
                                        </CtaButton>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPreviewMatchId(match.matchInfo.matchId)}
                                            className="gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Preview
                                        </Button>
                                    </div>
                                    <MatchHistoryCard
                                        matchData={match}
                                        targetPuuid={puuid}
                                    />
                                </div>
                            );
                        })
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
