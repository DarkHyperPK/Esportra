import { BUY_LABEL, BUY_MEANING, money, rateText } from '@/services/scrimInsights/present';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

/** Spending and loadouts for your team, and how rounds went at each buy level. */
export function EconomyPanel({ report }: { report: InsightsReport }) {
  const e = report.economy;
  if (e.winRateByBuy.length === 0 && e.avgLoadoutMine == null) return null;
  return (
    <ReportSection title="Economy" note={BUY_MEANING}>
      <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
        {[['Average loadout, your team', money(e.avgLoadoutMine)], ['Average loadout, opponent', money(e.avgLoadoutTheirs)],
          ['In rounds you won', money(e.avgLoadoutInWonRounds)], ['In rounds you lost', money(e.avgLoadoutInLostRounds)], ['Pistol rounds won', rateText(e.pistolRounds)]]
          .map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-white/5 py-1"><dt className="text-zinc-400">{k}</dt><dd className="tabular-nums text-zinc-100">{v}</dd></div>)}
      </dl>
      {e.winRateByBuy.length > 0 && (
        <table className="mt-3 w-full text-left text-[13px]">
          <caption className="sr-only">Rounds won by buy</caption>
          <thead><tr className="text-[10px] uppercase tracking-wide text-zinc-500"><th className="py-1 font-semibold">Buy</th><th className="font-semibold">Rounds won</th></tr></thead>
          <tbody>{e.winRateByBuy.map((b) => <tr key={b.buy} className="border-t border-white/5"><th scope="row" className="py-1.5 font-normal text-zinc-200">{BUY_LABEL[b.buy] ?? b.buy}</th><td className="tabular-nums text-zinc-100">{rateText(b.roundsWon)}</td></tr>)}</tbody>
        </table>
      )}
    </ReportSection>
  );
}
