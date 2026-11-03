import { formatNumber, formatPct } from '@/services/scrimData/format';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

/** Damage dealt and taken, who carried the damage and kills, and multi-kills. */
export function CombatPanel({ report }: { report: InsightsReport }) {
  return (
    <ReportSection title="Damage and multi-kills" note="Share is the player’s part of their team’s total in this match. Damage per kill is damage dealt ÷ kills.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead><tr className="text-[10px] uppercase tracking-wide text-zinc-500">
            {['Player', 'Dealt', 'Taken', 'Dmg share', 'Kill share', 'Dmg / kill', '2K', '3K', '4K', '5K'].map((h, i) => <th key={h} scope="col" className={i === 0 ? 'py-1 pr-3 font-semibold' : 'px-3 text-right font-semibold'}>{h}</th>)}
          </tr></thead>
          <tbody>{report.players.map((p) => (
            <tr key={p.key} className="border-t border-white/5 tabular-nums">
              <th scope="row" className="max-w-[160px] truncate py-1.5 pr-3 font-normal text-white">{p.name}<span className="ml-2 text-[11px] text-zinc-600">{p.mine ? '' : 'opponent'}</span></th>
              {[p.damage, p.damageReceived, formatPct(p.damageShare), formatPct(p.killShare), formatNumber(p.damagePerKill, 0), p.k2, p.k3, p.k4, p.k5]
                .map((v, i) => <td key={i} className="px-3 text-right text-zinc-200">{v}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </ReportSection>
  );
}
