import { lazy, Suspense } from 'react';
import { useMapMinimap } from '@/components/competitive/scrims/data/maps/useMapMinimap';
import { PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimTimeline } from '@/hooks/competitive/useScrimTimeline';
import { MatchHeatmap } from './MatchHeatmap';

const ScrimMapTimeline = lazy(() => import('./ScrimMapTimeline'));

interface Props { sessionId: string; gameNumber: number; teamId?: string }

/** One scrim map event by event, exactly as the scoreboard's timeline shows it, with this map's heatmap underneath. Loads when opened. */
export default function TimelineTab({ sessionId, gameNumber, teamId }: Props) {
  const q = useScrimTimeline(sessionId, gameNumber, teamId);
  const minimap = useMapMinimap(q.data?.map);
  const timeline = q.data?.timeline;
  return (
    <div className="space-y-6">
      <Suspense fallback={<PanelSkeleton />}><ScrimMapTimeline sessionId={sessionId} gameNumber={gameNumber} teamId={teamId} /></Suspense>
      {timeline && minimap.status === 'ready' && (
        <section aria-label="Heatmap of this map" className="max-w-[760px]">
          <MatchHeatmap timeline={timeline} art={minimap.art} transform={minimap.transform} map={q.data?.map ?? null} />
        </section>
      )}
    </div>
  );
}
