import React, { useMemo, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Loader2, Share2 } from 'lucide-react';
import MatchHistoryCard from '@/components/debug/MatchHistoryCard';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import {
  pickEnrichedTargetPuuid,
  resolveStoredEnrichedMatch,
  resolveValShardRegion,
  useEnrichedRiotMatch,
} from '@/hooks/useRiotGameDetails';
import type { MatchDetailsPayload } from '@/types/matchDetails';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import { useToast } from '@/hooks/use-toast';

const OBS_WIDTH = 1600;
const OBS_HEIGHT = 900;

export interface MatchGameStatisticsPanelProps {
  riotMatchId?: string | null;
  details?: MatchDetailsPayload | null;
  team1Name: string;
  team2Name: string;
  team1Id?: string;
  team2Id?: string;
  team1Score: number;
  team2Score: number;
  mapName?: string;
  gameNumber?: number;
  reportedByTeamId?: string;
  t1Side?: 'Blue' | 'Red';
  loading?: boolean;
  compact?: boolean;
  showShareCards?: boolean;
  captainRoomMode?: boolean;
  captainTeamId?: string;
  fetchLive?: boolean;
}

function buildObsOverlayUrl(
  enriched: EnrichedRiotMatchData,
  mode: 'match' | 'player',
  options: {
    region?: string | null;
    team1Name: string;
    team2Name: string;
    mapName?: string;
    playerPuuid?: string;
  },
): string {
  const matchId = enriched.matchInfo.matchId;
  if (!matchId) return '';

  const params = new URLSearchParams({
    region: resolveValShardRegion(options.region),
    matchId,
    teamA: options.team1Name,
    teamB: options.team2Name,
    teamAColor: '#4c1d83',
    teamBColor: '#cf69da',
    accentColor: '#ef151c',
    bgDim: '0.72',
    leftSide: 'winner',
    nameMode: 'full',
    transition: 'none',
    sponsorSize: '1',
    sponsorWidth: '210',
    sponsorHeight: '170',
    sponsorX: '0',
    sponsorY: '0',
    sponsorFit: 'contain',
    mvpLabel: 'MVP',
    title: 'Player Stats',
    subtitle: 'Match Performance',
    showMap: '1',
    showLogos: '1',
    showPortraits: '1',
    showMvpBadges: '1',
    showRows: '1',
    showKda: '1',
    showAcs: '1',
    showKdRatio: '1',
    showAdr: '1',
    showHs: '1',
    showFb: '1',
    showAbilityCasts: '1',
    highlightLeader: '1',
    showDelta: '1',
    showTeamContext: '1',
  });

  if (options.mapName) params.set('mapName', options.mapName);
  if (mode === 'player' && options.playerPuuid) {
    params.set('playerPuuid', options.playerPuuid);
  }

  const route = mode === 'match' ? '/debug/riot/overlay/match' : '/debug/riot/overlay/player';
  return `${window.location.origin}${route}?${params.toString()}`;
}

async function downloadObsOverlayPng(url: string, filename: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${OBS_WIDTH}px`;
  iframe.style.height = `${OBS_HEIGHT}px`;
  iframe.style.border = '0';
  iframe.src = url;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Overlay render timed out')), 20000);
      iframe.onload = () => {
        window.clearTimeout(timeout);
        window.setTimeout(resolve, 1800);
      };
      iframe.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Overlay failed to load'));
      };
    });

    const body = iframe.contentDocument?.body;
    if (!body) throw new Error('Overlay document unavailable');

    const dataUrl = await toPng(body, {
      width: OBS_WIDTH,
      height: OBS_HEIGHT,
      pixelRatio: 1,
      cacheBust: true,
      fontEmbedCSS: '',
    } as Parameters<typeof toPng>[1]);

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } finally {
    document.body.removeChild(iframe);
  }
}

export const MatchGameStatisticsPanel: React.FC<MatchGameStatisticsPanelProps> = ({
  riotMatchId,
  details = null,
  team1Name,
  team2Name,
  team1Id,
  team2Id,
  team1Score,
  team2Score,
  mapName,
  reportedByTeamId,
  t1Side,
  loading: externalLoading = false,
  showShareCards = false,
  captainRoomMode = false,
  captainTeamId,
  fetchLive = true,
}) => {
  const { toast } = useToast();
  const storedEnriched = resolveStoredEnrichedMatch(details);
  const region = details?.matchInfo?.region ?? storedEnriched?.matchInfo?.region ?? storedEnriched?.matchInfoParsed?.region;
  const resolvedT1Side = t1Side ?? details?.t1Side;
  const shouldFetch = fetchLive && Boolean(riotMatchId) && !storedEnriched;
  const { data: fetchedEnriched, isLoading: fetchingEnriched, isError } = useEnrichedRiotMatch(
    riotMatchId,
    region,
    shouldFetch,
  );
  const enriched = storedEnriched ?? fetchedEnriched ?? null;
  const loading = externalLoading || (shouldFetch && fetchingEnriched);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const captainRiotSide = useMemo(() => {
    if (!resolvedT1Side || !captainTeamId || !team1Id) return resolvedT1Side ?? null;
    return captainTeamId === team1Id
      ? resolvedT1Side
      : (resolvedT1Side === 'Blue' ? 'Red' : 'Blue');
  }, [captainTeamId, resolvedT1Side, team1Id]);

  const rosterPlayers = useMemo(() => {
    if (!enriched) return [];
    if (!captainRoomMode || !captainRiotSide) return enriched.players;
    return enriched.players.filter((player) => player.teamId === captainRiotSide);
  }, [captainRoomMode, captainRiotSide, enriched]);

  const targetPuuid = useMemo(
    () => (enriched ? pickEnrichedTargetPuuid(enriched, captainRiotSide ?? resolvedT1Side ?? null) : null),
    [captainRiotSide, enriched, resolvedT1Side],
  );

  const overlayBase = useMemo(() => {
    if (!enriched) return null;
    return {
      region,
      team1Name,
      team2Name,
      mapName,
    };
  }, [enriched, mapName, region, team1Name, team2Name]);

  const downloadOverlay = async (key: string, url: string, filename: string) => {
    if (!url || exportingKey) return;
    setExportingKey(key);
    try {
      await downloadObsOverlayPng(url, filename);
      toast({ title: 'Share card saved', description: filename });
    } catch (error) {
      console.error('OBS overlay export failed:', error);
      toast({
        title: 'Download failed',
        description: 'Could not generate the share image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExportingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
        Loading enriched match data…
      </div>
    );
  }

  if (enriched && targetPuuid && resolvedT1Side) {
    const matchOverlayUrl = overlayBase
      ? buildObsOverlayUrl(enriched, 'match', overlayBase)
      : '';

    return (
      <div className="space-y-4">
        {captainRoomMode && showShareCards && overlayBase ? (
          <div className="space-y-3 border border-white/10 bg-black/30 p-4">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400">
              <Share2 className="h-3.5 w-3.5 text-rose-400" />
              Share cards
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!matchOverlayUrl || exportingKey !== null}
                onClick={() => downloadOverlay(
                  'match',
                  matchOverlayUrl,
                  `esportra-match-${team1Name.replace(/\s+/g, '-').toLowerCase()}-vs-${team2Name.replace(/\s+/g, '-').toLowerCase()}.png`,
                )}
                className="inline-flex items-center gap-2 border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:border-rose-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exportingKey === 'match' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download match card
              </button>
            </div>
            {rosterPlayers.length > 0 ? (
              <div className="space-y-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">Your roster</p>
                <div className="flex flex-wrap gap-2">
                  {rosterPlayers.map((player) => {
                    const playerUrl = buildObsOverlayUrl(enriched, 'player', {
                      ...overlayBase,
                      playerPuuid: player.puuid,
                    });
                    const exportKey = `player-${player.puuid}`;
                    const label = `${player.gameName || 'Player'}${player.tagLine ? `#${player.tagLine}` : ''}`;
                    return (
                      <button
                        key={player.puuid}
                        type="button"
                        disabled={!playerUrl || exportingKey !== null}
                        onClick={() => downloadOverlay(
                          exportKey,
                          playerUrl,
                          `esportra-player-${(player.gameName || 'player').replace(/\s+/g, '-').toLowerCase()}.png`,
                        )}
                        className="inline-flex items-center gap-2 border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:border-rose-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {exportingKey === exportKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <MatchHistoryCard
          matchData={enriched}
          targetPuuid={targetPuuid}
          team1Name={team1Name}
          team2Name={team2Name}
          t1Side={resolvedT1Side}
          directView={captainRoomMode}
        />
      </div>
    );
  }

  if ((details?.players?.length ?? 0) > 0) {
    return (
      <div className="space-y-3">
        {isError && riotMatchId ? (
          <p className="text-sm text-amber-300">
            Full enriched stats could not be loaded. Showing stored scoreboard data.
          </p>
        ) : null}
        <FullScoreboard
          players={details?.players}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Score={team1Score}
          team2Score={team2Score}
          reporterSide={details?.reporterSide}
          reportedByTeamId={reportedByTeamId ?? details?.reportedByTeamId}
          team1Id={team1Id}
          t1Side={details?.t1Side}
        />
      </div>
    );
  }

  return (
    <div className="border border-dashed border-white/10 px-5 py-10 text-center text-sm text-zinc-500">
      No automated Riot payload for this game. Submitted evidence or manual scores are shown above.
    </div>
  );
};

export default MatchGameStatisticsPanel;
