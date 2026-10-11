import type { PublicVetoUsageSummary as Summary } from '@/types/publicVetoSessions';
import { vetoUsageRates } from './publicVetoSessionRules';

export function PublicVetoUsageSummary({ summary }: { summary: Summary }) {
  const rates = vetoUsageRates(summary);
  const cells = [{ label: 'Total sessions', value: summary.totalSessions.toLocaleString() }, { label: 'Completion rate', value: rates.completion }, { label: 'Overlay adoption', value: rates.overlay }];
  return (
    <div>
      <dl className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
        {cells.map((cell) => <div key={cell.label} className="flex items-center justify-between gap-3 bg-card px-4 py-3 sm:block">
          <dt className="text-[13px] text-zinc-400">{cell.label}</dt>
          <dd className="font-heading text-2xl font-extrabold tabular-nums text-white sm:mt-1">{cell.value}</dd>
        </div>)}
      </dl>
      <p className="mt-2 text-xs text-zinc-400">Across all sessions matching the game filter.</p>
    </div>
  );
}
