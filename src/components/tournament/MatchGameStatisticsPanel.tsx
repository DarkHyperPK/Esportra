import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { ShareCardsPanel } from '@/components/share-cards/ShareCardsPanel';
import MatchHistoryCard from '@/components/debug/MatchHistoryCard';
import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import {
  pickEnrichedTargetPuuid,
  resolveStoredEnrichedMatch,
  useEnrichedRiotMatch,
} from '@/hooks/useRiotGameDetails';
import type { MatchDetailsPayload } from '@/types/matchDetails';

export interface MatchGameStatisticsPanelProps {
  riotMatchId?: string | null;
  details?: MatchDetailsPayload | null;
  team1Name: string;
  team2Name: string;
  team1Id?: string;
  team2Id?: string;
  team1Logo?: string;
  team2Logo?: string;
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
  isOrganizer?: boolean;
  fetchLive?: boolean;
}

export const MatchGameStatisticsPanel: React.FC<MatchGameStatisticsPanelProps> = ({
  riotMatchId,
  details = null,
  team1Name,
  team2Name,
  team1Id,
  team2Id: _team2Id,
  team1Logo,
  team2Logo,
  team1Score,
  team2Score,
  mapName,
  reportedByTeamId,
  t1Side,
  loading: externalLoading = false,
  showShareCards = false,
  captainRoomMode = false,
  captainTeamId,
  isOrganizer = false,
  fetchLive = true,
}) => {
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

  const captainRiotSide = useMemo(() => {
    if (!resolvedT1Side || !captainTeamId || !team1Id) return resolvedT1Side ?? null;
    return captainTeamId === team1Id
      ? resolvedT1Side
      : (resolvedT1Side === 'Blue' ? 'Red' : 'Blue');
  }, [captainTeamId, resolvedT1Side, team1Id]);

  const rosterPlayers = useMemo(() => {
    if (!enriched) return [];
    if (isOrganizer) return enriched.players;
    if (!captainRoomMode || !captainRiotSide) return enriched.players;
    return enriched.players.filter((player) => player.teamId === captainRiotSide);
  }, [captainRoomMode, captainRiotSide, enriched, isOrganizer]);

  const targetPuuid = useMemo(
    () => (enriched ? pickEnrichedTargetPuuid(enriched, captainRiotSide ?? resolvedT1Side ?? null) : null),
    [captainRiotSide, enriched, resolvedT1Side],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
        Loading enriched match data…
      </div>
    );
  }

  if (enriched && targetPuuid && resolvedT1Side) {
    const canShare = showShareCards && (captainRoomMode || isOrganizer) && rosterPlayers.length > 0;

    return (
      <div className="space-y-4">
        {canShare ? (
          <ShareCardsPanel
            enriched={enriched}
            playerPuuids={rosterPlayers.map((entry) => entry.puuid)}
            team1Name={team1Name}
            team2Name={team2Name}
            team1Logo={team1Logo}
            team2Logo={team2Logo}
            t1Side={resolvedT1Side}
            mapName={mapName || 'Map'}
          />
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
