import { NO_VALUE } from '@/services/scrimData/format';
import type { KillCatalog } from '@/services/scrimInsights/assets';
import { BUY_LABEL, BUY_MEANING, assetLabel, money, rateText } from '@/services/scrimInsights/present';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

function Uses({ title, rows, labels, icons }: { title: string; rows: Array<{ weapon: string; rounds: number }>; labels?: ReadonlyMap<string, string>; icons?: ReadonlyMap<string, string> }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-semibold text-zinc-400">{title}</p>
      <ul className="space-y-0.5 text-[13px]">
        {rows.slice(0, 6).map((r) => <li key={r.weapon} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">{icons?.get(r.weapon.toLowerCase()) ? <img src={icons.get(r.weapon.toLowerCase())} alt="" className="h-5 w-12 shrink-0 object-contain" loading="lazy" /> : null}<span className="truncate text-zinc-200">{assetLabel(r.weapon, labels)}</span></span><span className="tabular-nums text-zinc-500">{r.rounds} player-rounds</span></li>)}
      </ul>
    </div>
  );
}

/** Spending and loadouts for your team, and how rounds went at each buy level. */
export function EconomyPanel({ report, assets }: { report: InsightsReport; assets: KillCatalog }) {
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
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {e.weapons.length > 0 ? <Uses title="Weapons bought" rows={e.weapons} labels={assets.weaponName} icons={assets.weaponIcon} /> : <p className="text-[12px] text-zinc-500">{NO_VALUE}</p>}
        {e.armor.length > 0 && <Uses title="Armor bought" rows={e.armor} labels={assets.armorName} icons={assets.armorIcon} />}
      </div>
    </ReportSection>
  );
}
