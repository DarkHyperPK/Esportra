import { EYEBROW_CLASS } from '@/components/ui/kit';
import { NO_VALUE } from '@/services/scrimData/format';
import type { CoachUserRow } from '@/types/scrimReport';

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((100 * n) / of)}%` : NO_VALUE);

/** Each player's decisive moments: who takes the first fight and wins it, whose deaths are traded, who closes clutches. */
export function CoachPlayersTable({ rows }: { rows: CoachUserRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Players in the deciding moments" className="border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>Players in the deciding moments</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">Opening duels are the first kill of a round. A death is traded when a teammate kills the killer within 5 seconds. A clutch is being the last player alive against one or more enemies.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
              {['Player', 'Opening duels won', 'Openers untraded', 'Deaths traded', 'Trade kills', 'Clutches won', 'Multi-kill rounds won'].map((h, i) => <th key={h} scope="col" className={i === 0 ? 'py-1 pr-3' : 'whitespace-nowrap px-3 text-right'}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-t border-white/[0.06] text-[13px] tabular-nums">
                <th scope="row" className="max-w-[160px] truncate py-2 pr-3 text-left font-semibold text-white">{r.name ?? 'Player'}</th>
                <td className="px-3 text-right text-zinc-200">{r.entryDuels ? `${r.entryWins} of ${r.entryDuels} · ${pct(r.entryWins, r.entryDuels)}` : NO_VALUE}</td>
                <td className="px-3 text-right text-zinc-200">{r.untradedFirstDeaths}</td>
                <td className="px-3 text-right text-zinc-200">{r.deaths ? `${r.traded} of ${r.deaths} · ${pct(r.traded, r.deaths)}` : NO_VALUE}</td>
                <td className="px-3 text-right text-zinc-200">{r.tradeKills}</td>
                <td className="px-3 text-right text-zinc-200">{r.clutchAttempts ? `${r.clutchWins} of ${r.clutchAttempts}` : NO_VALUE}</td>
                <td className="px-3 text-right text-zinc-200">{r.multiKillRounds ? `${r.multiKillRoundsWon} of ${r.multiKillRounds}` : NO_VALUE}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
