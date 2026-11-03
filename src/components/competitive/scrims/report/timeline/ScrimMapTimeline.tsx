import { useMemo } from 'react';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { RiotTimelineMap, type ValorantMapMetadata } from '@/components/debug/RiotTimelineMap';
import { useScrimGames } from '@/hooks/competitive/useScrimGames';
import { useScrimTimeline } from '@/hooks/competitive/useScrimTimeline';
import { pickEnrichedTargetPuuid, resolveStoredEnrichedMatch } from '@/hooks/useRiotGameDetails';
import { useValorantAgents, useValorantMaps } from '@/hooks/useValorantCatalog';

interface Props { sessionId: string; gameNumber: number; teamId?: string }

const norm = (v: string | undefined) => v?.trim().toLowerCase() ?? '';

/**
 * The scoreboard's own timeline (round strip, event log, minimap with player view cones) for one scrim map, from the Riot snapshot stored when the map was reported.
 * Your side is found from the players the report marks as yours, so it reads from your team's point of view.
 */
export default function ScrimMapTimeline({ sessionId, gameNumber, teamId }: Props) {
  const games = useScrimGames(sessionId);
  const mine = useScrimTimeline(sessionId, gameNumber, teamId);
  const { data: agents } = useValorantAgents();
  const { data: maps } = useValorantMaps();
  const enriched = useMemo(() => resolveStoredEnrichedMatch(games.data?.games.find((g) => g.gameNumber === gameNumber)?.matchData ?? null), [games.data, gameNumber]);
  const side = useMemo(() => {
    const names = new Set((mine.data?.timeline?.players ?? []).filter((p) => p.mine).map((p) => norm(p.name)));
    const found = enriched?.players.find((p) => names.has(norm(p.gameName)));
    return found?.teamId === 'Blue' || found?.teamId === 'Red' ? found.teamId : null;
  }, [enriched, mine.data]);
  const mapData = useMemo<ValorantMapMetadata | null>(() => maps?.find((m) => m.mapUrl === enriched?.matchInfo.mapId) ?? null, [maps, enriched]);

  if (games.isLoading || mine.isLoading) return <PanelSkeleton />;
  if (games.isError) return <PanelError onRetry={() => void games.refetch()} />;
  const targetPuuid = enriched ? pickEnrichedTargetPuuid(enriched, side) : null;
  if (!enriched || !targetPuuid) return <PanelMessage>This map has no stored Riot timeline.</PanelMessage>;
  return (
    <RiotTimelineMap matchData={enriched} targetPuuid={targetPuuid} mapData={mapData} agents={agents ?? {}} teamALabel="Your team" teamBLabel="Opponent"
      displayTeamASide={side ?? undefined} fullWidth />
  );
}
