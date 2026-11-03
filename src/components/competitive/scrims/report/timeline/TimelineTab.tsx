import { useState } from 'react';
import { useMapMinimap } from '@/components/competitive/scrims/data/maps/useMapMinimap';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimTimeline } from '@/hooks/competitive/useScrimTimeline';
import { clock, eventMarkers, roundEvents } from '@/services/scrimInsights/timeline';
import { MatchHeatmap } from './MatchHeatmap';
import { MatchMinimap } from './MatchMinimap';
import { PlayerLanes } from './PlayerLanes';
import { RoundStrip } from './RoundStrip';

interface Props { sessionId: string; gameNumber: number; teamId?: string }

/** One map round by round: pick a round, click a moment on a player's lane, see everyone's recorded position on the minimap; the map's heatmap sits beside it. Loads when opened. */
export default function TimelineTab({ sessionId, gameNumber, teamId }: Props) {
  const q = useScrimTimeline(sessionId, gameNumber, teamId);
  const [roundNum, setRoundNum] = useState<number | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const data = q.data;
  const minimap = useMapMinimap(data?.map);

  if (q.isLoading) return <PanelSkeleton />;
  if (q.isError || !data) return <PanelError onRetry={() => void q.refetch()} />;
  const timeline = data.timeline;
  if (!timeline || timeline.rounds.length === 0) return <PanelMessage>{data.reason ?? 'There is no timeline for this map.'}</PanelMessage>;

  const round = timeline.rounds.find((r) => r.num === roundNum) ?? timeline.rounds[0];
  const events = roundEvents(round);
  const event = events.find((e) => e.id === eventId) ?? events[0];
  const markers = event ? eventMarkers(event, round) : [];
  return (
    <div className="space-y-4">
      <RoundStrip rounds={timeline.rounds} value={round.num} onChange={(n) => { setRoundNum(n); setEventId(null); }} />
      <p className="text-[12px] text-zinc-400" role="status" title="Riot records positions at kills, the plant and the defuse, not continuously.">
        {event ? `Round ${round.num} · ${clock(event.ms)} · ${markers.length} ${markers.length === 1 ? 'position' : 'positions'} recorded` : `Round ${round.num} · no recorded moments`}
      </p>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {minimap.status === 'loading' ? <PanelSkeleton /> : minimap.status === 'error' ? <PanelError onRetry={minimap.retry} /> : minimap.status === 'ready'
            ? <MatchMinimap art={minimap.art} transform={minimap.transform} markers={markers} players={timeline.players} label={`Positions in round ${round.num}`} />
            : <PanelMessage>{`Map art for ${data.map ?? 'this map'} is not available, so positions cannot be drawn.`}</PanelMessage>}
          <PlayerLanes round={round} players={timeline.players} selected={event?.id ?? null} onSelect={setEventId} />
        </div>
        <div>
          {minimap.status === 'ready' && <MatchHeatmap timeline={timeline} art={minimap.art} transform={minimap.transform} map={data.map ?? null} />}
        </div>
      </div>
    </div>
  );
}
