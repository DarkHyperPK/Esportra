import { InlineNotice, TabBar, TabPanel, useTabBase, type TabItem } from '@/components/ui/kit';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimGameInsights } from '@/hooks/competitive/useScrimGameInsights';
import { useTabParam } from '@/hooks/useTabParam';
import { TIER_LABEL, TIER_MEANING } from '@/services/scrimData/format';
import { AbilityPanel, ObjectivePanel } from './AbilityObjectivePanels';
import { CombatPanel } from './CombatPanel';
import { DecisivePanel } from './DecisivePanel';
import { EconomyPanel } from './EconomyPanel';
import { KillFeedPanel } from './KillFeedPanel';
import { OpeningPanel } from './OpeningPanel';
import { PlayerTable } from './PlayerTable';
import { ReportHeader } from './ReportHeader';
import { useReportAssets } from './useReportAssets';
import { RoundTimeline } from './RoundTimeline';

const REPORT_TABS = ['scoreboard', 'rounds', 'decisive', 'kills', 'economy', 'utility'] as const;
type ReportTab = (typeof REPORT_TABS)[number];
const TABS: readonly (TabItem & { id: ReportTab })[] = [
  { id: 'scoreboard', label: 'Scoreboard' }, { id: 'rounds', label: 'Rounds' }, { id: 'decisive', label: 'Decisive moments' }, { id: 'kills', label: 'Kills & damage' },
  { id: 'economy', label: 'Economy' }, { id: 'utility', label: 'Utility & spike' },
];

interface Props { sessionId: string; gameNumber: number; teamId?: string }

/** One scrim map in depth. Without verified Riot data it says what the map does have and why, and shows nothing invented. */
export function ScrimGameReport({ sessionId, gameNumber, teamId }: Props) {
  const { data, isLoading, isError, refetch } = useScrimGameInsights(sessionId, gameNumber, teamId);
  const [tab, setTab] = useTabParam(REPORT_TABS, 'scoreboard');
  const base = useTabBase();
  const assets = useReportAssets(!!data?.report);

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;
  const report = data.report;
  return (
    <div className="space-y-4">
      <ReportHeader data={data} />
      {!report ? (
        <>
          <InlineNotice tone="neutral">{data.reason ?? 'There is no detailed data for this map.'}</InlineNotice>
          <PanelMessage>{`${TIER_LABEL[data.tier]}. ${TIER_MEANING[data.tier]}`}</PanelMessage>
        </>
      ) : (
        <>
          <TabBar tabs={TABS} value={tab} onChange={(id) => setTab(id as ReportTab)} label="Map report sections" base={base} />
          <TabPanel base={base} id="scoreboard" value={tab}><PlayerTable players={report.players} /></TabPanel>
          <TabPanel base={base} id="rounds" value={tab} className="space-y-4"><RoundTimeline report={report} /><OpeningPanel report={report} /></TabPanel>
          <TabPanel base={base} id="decisive" value={tab}><DecisivePanel report={report} /></TabPanel>
          <TabPanel base={base} id="kills" value={tab} className="space-y-4"><KillFeedPanel report={report} assets={assets} /><CombatPanel report={report} /></TabPanel>
          <TabPanel base={base} id="economy" value={tab}><EconomyPanel report={report} assets={assets} /></TabPanel>
          <TabPanel base={base} id="utility" value={tab} className="space-y-4"><AbilityPanel report={report} /><ObjectivePanel report={report} /></TabPanel>
          <details className="rounded-none-none border border-white/5 p-4 text-[12px] text-zinc-400">
            <summary className="cursor-pointer font-semibold text-zinc-300">How these figures are worked out</summary>
            <ul className="mt-2 space-y-1">{report.formulas.map((f) => <li key={f.id}>{f.text}</li>)}</ul>
          </details>
        </>
      )}
    </div>
  );
}
