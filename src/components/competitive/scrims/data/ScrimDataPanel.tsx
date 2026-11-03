import { lazy, Suspense } from 'react';
import { TabBar, TabPanel, useTabBase } from '@/components/ui/kit';
import type { OverviewTeam } from './overview/OverviewDashboard';
import { useScrimData } from '@/hooks/competitive/useScrimData';
import { useTabParam } from '@/hooks/useTabParam';
import { EMPTY_TEXT } from '@/services/scrimData/format';
import { INSIGHT_GROUPS, INSIGHT_TABS, groupOf, type InsightTab } from '@/services/scrimData/insightTabs';
import { CompositionPanel } from './CompositionPanel';
import { CoverageSummary } from './CoverageSummary';
import { DataNotice } from './DataNotice';
import { MapsTab } from './maps/MapsTab';
import { PanelError, PanelMessage, PanelSkeleton } from './PanelStates';
import { PlayersPanel } from './PlayersPanel';
import { RecentMapsPanel } from './RecentMapsPanel';
import { RecordSummary } from './RecordSummary';
import { AgentTable } from './tabs/AgentTable';
import { PlayerAgentTable } from './tabs/PlayerAgentTable';

const TeamReportTab = lazy(() => import('./reports/TeamReportTab'));
const PlayerReportsTab = lazy(() => import('./reports/PlayerReportsTab'));
const OpponentsTab = lazy(() => import('./reports/OpponentsTab'));
const TrendsTab = lazy(() => import('./reports/TrendsTab'));
const OverviewDashboard = lazy(() => import('./overview/OverviewDashboard'));
const TimelineHome = lazy(() => import('./reports/TimelineHome'));
const MatchHistory = lazy(() => import('./history/MatchHistory'));
const HeatmapTab = lazy(() => import('./reports/HeatmapTab'));

/**
 * Scrim Insights for one team, in tabs so one category is on screen at a time. How thin or complete the data is stays above the tabs,
 * so no tab hides it. Only the open tab is rendered; Map picks fetches its own data when opened.
 */
export function ScrimDataPanel({ teamId, team }: { teamId: string; team?: OverviewTeam }) {
  const { isLoading, isError, data, refetch } = useScrimData(teamId);
  const [tab, setTab] = useTabParam(INSIGHT_TABS, 'overview');
  const base = useTabBase();
  const group = groupOf(tab);
  const nested = group.tabs.length > 1;
  const leafBase = nested ? `${base}-sub` : base;

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <DataNotice maps={data.sample.maps} from={data.sample.from} to={data.sample.to} coverage={data.coverage} truncated={data.truncated} />
      {!data.hasData ? (
        <PanelMessage>{EMPTY_TEXT}</PanelMessage>
      ) : (
        <>
          <TabBar tabs={INSIGHT_GROUPS.map((g) => ({ id: g.id, label: g.label }))} value={group.id} label="Scrim insights sections" base={base}
            onChange={(id) => setTab(INSIGHT_GROUPS.find((g) => g.id === id)?.tabs[0].id ?? 'overview')} />
          {nested && <TabBar tabs={group.tabs} value={tab} onChange={(id) => setTab(id as InsightTab)} label={`${group.label} sections`} base={leafBase} className="-mt-2" />}
          <TabPanel base={leafBase} id="overview" value={tab}>
            <Suspense fallback={<PanelSkeleton />}>
              <OverviewDashboard teamId={teamId} team={team ?? { name: 'Your team', logoUrl: null, tag: null }} recent={data.recent}
                fallback={<div className="space-y-4"><CoverageSummary coverage={data.coverage} />
            <RecordSummary record={data.record} form={data.form} />
            <RecentMapsPanel maps={data.recent} teamId={teamId} /></div>} />
            </Suspense>
          </TabPanel>
          <TabPanel base={leafBase} id="team-report" value={tab}><Suspense fallback={<PanelSkeleton />}><TeamReportTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={leafBase} id="player-reports" value={tab}><Suspense fallback={<PanelSkeleton />}><PlayerReportsTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={leafBase} id="maps" value={tab}><MapsTab teamId={teamId} data={data} /></TabPanel>
          <TabPanel base={leafBase} id="history" value={tab}><Suspense fallback={<PanelSkeleton />}><MatchHistory maps={data.recent} teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={leafBase} id="timeline" value={tab}><Suspense fallback={<PanelSkeleton />}><TimelineHome maps={data.recent} teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={leafBase} id="agents" value={tab} className="space-y-4">
            <AgentTable agents={data.agents} />
            <CompositionPanel compositions={data.compositions} />
          </TabPanel>
          <TabPanel base={leafBase} id="opponents" value={tab}><Suspense fallback={<PanelSkeleton />}><OpponentsTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={leafBase} id="trends" value={tab}><Suspense fallback={<PanelSkeleton />}><TrendsTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={leafBase} id="heatmaps" value={tab}><Suspense fallback={<PanelSkeleton />}><HeatmapTab teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={leafBase} id="players" value={tab} className="space-y-4">
            <PlayersPanel players={data.players} />
            <PlayerAgentTable rows={data.playerAgents} />
          </TabPanel>
        </>
      )}
    </div>
  );
}
