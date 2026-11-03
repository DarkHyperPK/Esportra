import { lazy, Suspense } from 'react';
import { TabBar, TabPanel, useTabBase, type TabItem } from '@/components/ui/kit';
import { useScrimData } from '@/hooks/competitive/useScrimData';
import { useTabParam } from '@/hooks/useTabParam';
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
import { AgentTable } from './tabs/AgentTable';
import { MapPicksTab } from './tabs/MapPicksTab';
import { PlayerAgentTable } from './tabs/PlayerAgentTable';

const TeamReportTab = lazy(() => import('./reports/TeamReportTab'));
const PlayerReportsTab = lazy(() => import('./reports/PlayerReportsTab'));
const OpponentsTab = lazy(() => import('./reports/OpponentsTab'));
const TrendsTab = lazy(() => import('./reports/TrendsTab'));
const HeatmapTab = lazy(() => import('./reports/HeatmapTab'));

const INSIGHT_TABS = ['overview', 'team-report', 'player-reports', 'maps', 'map-picks', 'agents', 'opponents', 'trends', 'heatmaps', 'players', 'roster'] as const;
type InsightTab = (typeof INSIGHT_TABS)[number];

const TABS: readonly (TabItem & { id: InsightTab })[] = [
  { id: 'overview', label: 'Overview' }, { id: 'team-report', label: 'Team report' }, { id: 'player-reports', label: 'Player reports' }, { id: 'maps', label: 'Maps' }, { id: 'map-picks', label: 'Map picks' },
  { id: 'agents', label: 'Agents & comps' }, { id: 'opponents', label: 'Opponents' }, { id: 'trends', label: 'Trends' }, { id: 'heatmaps', label: 'Heatmaps' }, { id: 'players', label: 'Players' }, { id: 'roster', label: 'Roster' },
];

/**
 * Scrim Insights for one team, in tabs so one category is on screen at a time. How thin or complete the data is stays above the tabs,
 * so no tab hides it. Only the open tab is rendered; Map picks fetches its own data when opened.
 */
export function ScrimDataPanel({ teamId }: { teamId: string }) {
  const { isLoading, isError, data, refetch } = useScrimData(teamId);
  const [tab, setTab] = useTabParam(INSIGHT_TABS, 'overview');
  const base = useTabBase();

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <DataNotice maps={data.sample.maps} from={data.sample.from} to={data.sample.to} coverage={data.coverage} truncated={data.truncated} />
      {!data.hasData ? (
        <PanelMessage>{EMPTY_TEXT}</PanelMessage>
      ) : (
        <>
          <TabBar tabs={TABS} value={tab} onChange={(id) => setTab(id as InsightTab)} label="Scrim insights sections" base={base} />
          <TabPanel base={base} id="overview" value={tab} className="space-y-4">
            <CoverageSummary coverage={data.coverage} />
            <RecordSummary record={data.record} form={data.form} />
            <ActivityBars activity={data.activity} />
            <RecentMapsPanel maps={data.recent} teamId={teamId} />
          </TabPanel>
          <TabPanel base={base} id="team-report" value={tab}><Suspense fallback={<PanelSkeleton />}><TeamReportTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={base} id="player-reports" value={tab}><Suspense fallback={<PanelSkeleton />}><PlayerReportsTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={base} id="maps" value={tab} className="space-y-4">
            <MapPoolPanel maps={data.maps} unplayed={data.unplayedMaps} minSample={data.minMapSample} />
          </TabPanel>
          <TabPanel base={base} id="map-picks" value={tab}><MapPicksTab teamId={teamId} /></TabPanel>
          <TabPanel base={base} id="agents" value={tab} className="space-y-4">
            <AgentTable agents={data.agents} />
            <CompositionPanel compositions={data.compositions} />
          </TabPanel>
          <TabPanel base={base} id="opponents" value={tab}><Suspense fallback={<PanelSkeleton />}><OpponentsTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={base} id="trends" value={tab}><Suspense fallback={<PanelSkeleton />}><TrendsTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={base} id="heatmaps" value={tab}><Suspense fallback={<PanelSkeleton />}><HeatmapTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={base} id="players" value={tab} className="space-y-4">
            <PlayersPanel players={data.players} />
            <PlayerAgentTable rows={data.playerAgents} />
          </TabPanel>
          <TabPanel base={base} id="roster" value={tab}><RosterPanel roster={data.roster} /></TabPanel>
        </>
      )}
    </div>
  );
}
