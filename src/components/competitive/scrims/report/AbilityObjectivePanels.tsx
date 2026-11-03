import { formatNumber } from '@/services/scrimData/format';
import { rateText, roundClock } from '@/services/scrimInsights/present';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

const dash = (v: number | null) => (v == null ? '—' : v);

/** Ability casts as Riot totals them for the map (Riot gives no per-round counts). */
export function AbilityPanel({ report }: { report: InsightsReport }) {
  const name = (key: string) => report.players.find((p) => p.key === key);
  return (
    <ReportSection title="Abilities" note="Riot reports cast totals for the whole map, not per round, so there is no round-by-round view.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-left text-[13px]">
          <thead><tr className="text-[10px] uppercase tracking-wide text-zinc-500">
            {['Player', 'Grenade', 'Ability 1', 'Ability 2', 'Ultimate', 'Per round'].map((h, i) => <th key={h} scope="col" className={i === 0 ? 'py-1 pr-3 font-semibold' : 'px-3 text-right font-semibold'}>{h}</th>)}
          </tr></thead>
          <tbody>{report.abilities.map((a) => (
            <tr key={a.key} className="border-t border-white/5 tabular-nums">
              <th scope="row" className="max-w-[160px] truncate py-1.5 pr-3 font-normal text-white">{name(a.key)?.name ?? a.key}</th>
              {[dash(a.grenade), dash(a.ability1), dash(a.ability2), dash(a.ultimate), formatNumber(a.perRound, 1)].map((v, i) => <td key={i} className="px-3 text-right text-zinc-200">{v}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ReportSection>
  );
}

/** Spike plants and defuses. */
export function ObjectivePanel({ report }: { report: InsightsReport }) {
  const o = report.objectives;
  const name = (key: string) => report.players.find((p) => p.key === key)?.name ?? key;
  const lines: Array<[string, string]> = [
    ['Average plant time', roundClock(o.avgPlantMs)], ['Average defuse time', roundClock(o.avgDefuseMs)],
    ['Won after your team planted', rateText(o.winWhenPlanting)], ['Won after the opponent planted', rateText(o.winWhenOpponentPlants)],
  ];
  return (
    <ReportSection title="Spike" note="Times are from the start of the round.">
      <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
        {lines.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-white/5 py-1"><dt className="text-zinc-400">{k}</dt><dd className="tabular-nums text-zinc-100">{v}</dd></div>)}
      </dl>
      <p className="mt-3 text-[13px] text-zinc-300">
        {o.byPlayer.length === 0 ? 'No plants or defuses were recorded.' : o.byPlayer.map((p) => `${name(p.key)}: ${p.plants} plant${p.plants === 1 ? '' : 's'}, ${p.defuses} defuse${p.defuses === 1 ? '' : 's'}`).join(' · ')}
      </p>
      {o.sites.length > 0 && <p className="mt-1 text-[12px] text-zinc-500">Your plants by site: {o.sites.map((s) => `${s.weapon} ${s.rounds}`).join(' · ')}</p>}
    </ReportSection>
  );
}
