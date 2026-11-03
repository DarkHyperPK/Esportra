import { useMemo } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimGameInsights } from '@/hooks/competitive/useScrimGameInsights';
import { useValorantWeapons } from '@/hooks/useValorantCatalog';
import { TIER_LABEL, TIER_MEANING } from '@/services/scrimData/format';
import { AbilityPanel, ObjectivePanel } from './AbilityObjectivePanels';
import { CombatPanel } from './CombatPanel';
import { EconomyPanel } from './EconomyPanel';
import { KillFeedPanel } from './KillFeedPanel';
import { OpeningPanel } from './OpeningPanel';
import { PlayerTable } from './PlayerTable';
import { ReportHeader } from './ReportHeader';
import { RoundTimeline } from './RoundTimeline';

interface Props { sessionId: string; gameNumber: number; teamId?: string }

/** One scrim map in depth. Without verified Riot data it says what the map does have and why, and shows nothing invented. */
export function ScrimGameReport({ sessionId, gameNumber, teamId }: Props) {
  const { data, isLoading, isError, refetch } = useScrimGameInsights(sessionId, gameNumber, teamId);
  const { data: weaponList } = useValorantWeapons(!!data?.report);
  const weapons = useMemo(() => new Map((weaponList ?? []).flatMap((w) => (w.uuid && w.displayName ? [[w.uuid.toLowerCase(), w.displayName] as const] : []))), [weaponList]);

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
          <PlayerTable players={report.players} />
          <RoundTimeline report={report} />
          <OpeningPanel report={report} />
          <KillFeedPanel report={report} weapons={weapons} />
          <CombatPanel report={report} />
          <EconomyPanel report={report} weapons={weapons} />
          <AbilityPanel report={report} />
          <ObjectivePanel report={report} />
          <details className="rounded-xl border border-white/5 p-4 text-[12px] text-zinc-400">
            <summary className="cursor-pointer font-semibold text-zinc-300">How these figures are worked out</summary>
            <ul className="mt-2 space-y-1">{report.formulas.map((f) => <li key={f.id}>{f.text}</li>)}</ul>
          </details>
        </>
      )}
    </div>
  );
}
