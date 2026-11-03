import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimMapPicks } from '@/hooks/competitive/useScrimMapPicks';
import { isSmallSample } from '@/services/scrimData/format';
import { MapPicksView } from './MapPicksView';

/** What the team and its opponents picked and banned in map vetoes, and how maps went by who chose them. Loads only when opened. */
export function MapPicksTab({ teamId }: { teamId: string }) {
  const { isLoading, isError, data, refetch } = useScrimMapPicks(teamId);
  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;
  if (!data.hasData) return <PanelMessage>No finished map vetoes yet. Picks and bans appear here once a scrim’s veto is completed.</PanelMessage>;
  const { picks } = data;
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-zinc-400">
        Based on {picks.vetoes} finished map {picks.vetoes === 1 ? 'veto' : 'vetoes'}{isSmallSample(picks.vetoes) ? ' · small sample' : ''}.
        {picks.unattributed > 0 ? ` ${picks.unattributed} ${picks.unattributed === 1 ? 'map was' : 'maps were'} not matched to a veto map and left out of the results.` : ''}
        {data.truncated ? ' Showing the most recent vetoes only.' : ''}
      </p>
      <MapPicksView picks={picks} />
    </div>
  );
}
