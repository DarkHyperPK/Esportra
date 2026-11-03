import { lazy, Suspense } from 'react';
import { InlineNotice, TabBar, TabPanel, useTabBase, type TabItem } from '@/components/ui/kit';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimGameInsights } from '@/hooks/competitive/useScrimGameInsights';
import { useTabParam } from '@/hooks/useTabParam';
import { TIER_LABEL, TIER_MEANING } from '@/services/scrimData/format';
import { CombatPanel } from './CombatPanel';
import { DecisivePanel } from './DecisivePanel';
import { EconomyPanel } from './EconomyPanel';
import { OpeningPanel } from './OpeningPanel';
import { PlayerTable } from './PlayerTable';
import { ReportHeader } from './ReportHeader';
import { RoundTimeline } from './RoundTimeline';
import { ScreenshotEvidence } from './ScreenshotEvidence';
import { SpikePanel } from './SpikePanel';

const TimelineTab = lazy(() => import('./timeline/TimelineTab'));

const REPORT_TABS = ['scoreboard', 'timeline', 'rounds', 'decisive', 'impact', 'economy', 'spike'] as const;
type ReportTab = (typeof REPORT_TABS)[number];
const TABS: readonly (TabItem & { id: ReportTab })[] = [
  { id: 'scoreboard', label: 'Scoreboard' }, { id: 'timeline', label: 'Timeline' }, { id: 'rounds', label: 'Rounds' }, { id: 'decisive', label: 'Decisive moments' }, { id: 'impact', label: 'Impact' },
  { id: 'economy', label: 'Economy' }, { id: 'spike', label: 'Spike & retakes' },
];

interface Props { sessionId: string; gameNumber: number; teamId?: string }

/** One scrim map in depth. Without verified Riot data it says what the map does have and why, and shows nothing invented. */
export function ScrimGameReport({ sessionId, gameNumber, teamId }: Props) {
  const { data, isLoading, isError, refetch } = useScrimGameInsights(sessionId, gameNumber, teamId);
  const [tab, setTab] = useTabParam(REPORT_TABS, 'scoreboard');
  const base = useTabBase();

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;
  const report = data.report;
  return (
    <div className="space-y-4">
      <ReportHeader data={data} />
      {!report ? (
        <>
          {data.tier === 'screenshot' ? (
            <>
              <InlineNotice tone="neutral">Read from a scoreboard screenshot: player lines only, no round-by-round detail.</InlineNotice>
              <ScreenshotEvidence sessionId={sessionId} gameNumber={gameNumber} mapName={data.map} />
            </>
          ) : (
            <>
              <InlineNotice tone="neutral">{data.reason ?? 'There is no detailed data for this map.'}</InlineNotice>
              <PanelMessage>{`${TIER_LABEL[data.tier]}. ${TIER_MEANING[data.tier]}`}</PanelMessage>
            </>
          )}
        </>
      ) : (
        <>
          <TabBar tabs={TABS} value={tab} onChange={(id) => setTab(id as ReportTab)} label="Map report sections" base={base} />
          <TabPanel base={base} id="scoreboard" value={tab}><PlayerTable players={report.players} /></TabPanel>
          <TabPanel base={base} id="timeline" value={tab}><Suspense fallback={<PanelSkeleton />}><TimelineTab sessionId={sessionId} gameNumber={gameNumber} teamId={teamId} /></Suspense></TabPanel>
          <TabPanel base={base} id="rounds" value={tab} className="space-y-4"><RoundTimeline report={report} /><OpeningPanel report={report} /></TabPanel>
          <TabPanel base={base} id="decisive" value={tab}><DecisivePanel report={report} /></TabPanel>
          <TabPanel base={base} id="impact" value={tab}><CombatPanel report={report} /></TabPanel>
          <TabPanel base={base} id="economy" value={tab}><EconomyPanel report={report} /></TabPanel>
          <TabPanel base={base} id="spike" value={tab}><SpikePanel report={report} /></TabPanel>
          <details className="rounded-none border border-white/5 p-4 text-[12px] text-zinc-400">
            <summary className="cursor-pointer font-semibold text-zinc-300">How these figures are worked out</summary>
            <ul className="mt-2 space-y-1">{report.formulas.map((f) => <li key={f.id}>{f.text}</li>)}</ul>
          </details>
        </>
      )}
    </div>
  );
}
