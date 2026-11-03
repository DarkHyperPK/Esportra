import { useScrimData } from '@/hooks/competitive/useScrimData';
import { EMPTY_TEXT } from '@/services/scrimData/format';
import { ActivityBars } from './ActivityBars';
import { CompositionPanel } from './CompositionPanel';
import { CoverageSummary } from './CoverageSummary';
import { DataNotice } from './DataNotice';
import { MapPoolPanel } from './MapPoolPanel';
import { PanelError, PanelMessage, PanelSkeleton } from './PanelStates';
import { PlayersPanel } from './PlayersPanel';
import { RecentMapsPanel } from './RecentMapsPanel';
import { RecordSummary } from './RecordSummary';
import { RosterPanel } from './RosterPanel';

/** A team's own scrim data, for its members: the record, the maps, what was played, and who played. */
export function ScrimDataPanel({ teamId }: { teamId: string }) {
  const { isLoading, isError, data, refetch } = useScrimData(teamId);

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;

  return (
    <div className="space-y-5">
      <DataNotice maps={data.sample.maps} from={data.sample.from} to={data.sample.to} coverage={data.coverage} truncated={data.truncated} />
      {!data.hasData ? (
        <PanelMessage>{EMPTY_TEXT}</PanelMessage>
      ) : (
        <>
          <CoverageSummary coverage={data.coverage} />
          <RecordSummary record={data.record} form={data.form} />
          <ActivityBars activity={data.activity} />
          <MapPoolPanel maps={data.maps} unplayed={data.unplayedMaps} minSample={data.minMapSample} />
          <CompositionPanel compositions={data.compositions} />
          <PlayersPanel players={data.players} />
          <RosterPanel roster={data.roster} />
          <RecentMapsPanel maps={data.recent} teamId={teamId} />
        </>
      )}
    </div>
  );
}
