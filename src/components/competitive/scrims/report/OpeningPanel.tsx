import { NO_VALUE } from '@/services/scrimData/format';
import { rateText, roundClock } from '@/services/scrimInsights/present';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

/** The first kill of each round and what followed it. */
export function OpeningPanel({ report }: { report: InsightsReport }) {
  const o = report.opening;
  const name = (key: string) => report.players.find((p) => p.key === key)?.name ?? NO_VALUE;
  const active = o.players.filter((p) => p.kills + p.deaths > 0);
  const lines: Array<[string, string]> = [
    ['Rounds your team opened', rateText(o.firstBloodRounds)], ['Won after getting the first kill', rateText(o.winAfterFirstBlood)],
    ['Won after losing the first duel', rateText(o.winAfterFirstDeath)], ['Opened on attack', rateText(o.attackFirstBlood)], ['Opened on defense', rateText(o.defenseFirstBlood)],
  ];
  return (
    <ReportSection title="Opening duels" note="An opening duel is the first kill of a round. Times are measured from the start of the round.">
      <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
        {lines.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-white/5 py-1"><dt className="text-zinc-400">{k}</dt><dd className="tabular-nums text-zinc-100">{v}</dd></div>)}
      </dl>
      {active.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead><tr className="text-[10px] uppercase tracking-wide text-zinc-500"><th className="py-1 pr-3 font-semibold">Player</th><th className="px-3 font-semibold">Won</th><th className="px-3 font-semibold">Lost</th><th className="px-3 font-semibold">Duels won</th><th className="px-3 font-semibold">First kill at</th><th className="px-3 font-semibold">First death at</th></tr></thead>
            <tbody>{active.map((p) => (
              <tr key={p.key} className="border-t border-white/5 tabular-nums">
                <th scope="row" className="max-w-[160px] truncate py-1.5 pr-3 font-normal text-white">{name(p.key)}</th>
                <td className="px-3">{p.kills}</td><td className="px-3">{p.deaths}</td><td className="px-3">{rateText(p.duelsWon)}</td>
                <td className="px-3">{roundClock(p.avgMsToFirstKill)}</td><td className="px-3">{roundClock(p.avgMsToFirstDeath)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </ReportSection>
  );
}
