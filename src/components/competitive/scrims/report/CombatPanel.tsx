import { formatPct } from '@/services/scrimData/format';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

/** Who carried the damage and the kills for your team, and who won rounds with multi-kills. Opponents are on the scoreboard. */
export function CombatPanel({ report }: { report: InsightsReport }) {
  const team = report.players.filter((p) => p.mine).sort((a, b) => (b.damageShare ?? 0) - (a.damageShare ?? 0));
  return (
    <ReportSection title="Who carried" note="Share is the player's part of your team's total on this map. Multi-kill rounds are rounds with two or more kills.">
      <table className="w-full text-left text-[13px]">
        <thead><tr className="text-[10px] uppercase tracking-wide text-zinc-500">
          {['Player', 'Damage share', 'Kill share', 'Multi-kill rounds'].map((h, i) => <th key={h} scope="col" className={i === 0 ? 'py-1 pr-3 font-semibold' : 'px-3 text-right font-semibold'}>{h}</th>)}
        </tr></thead>
        <tbody>{team.map((p) => (
          <tr key={p.key} className="border-t border-white/5 tabular-nums">
            <th scope="row" className="max-w-[200px] truncate py-1.5 pr-3 font-normal text-white">{p.name}</th>
            {[formatPct(p.damageShare), formatPct(p.killShare), p.k2 + p.k3 + p.k4 + p.k5].map((v, i) => <td key={i} className="px-3 text-right text-zinc-200">{v}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </ReportSection>
  );
}
