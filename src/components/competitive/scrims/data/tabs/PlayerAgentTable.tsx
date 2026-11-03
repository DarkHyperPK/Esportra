import { EYEBROW_CLASS } from '@/components/ui/kit';
import { resolveAgent } from '@/lib/valorantAgents';
import { formatNumber, formatPct } from '@/services/scrimData/format';
import type { PlayerAgentSummary } from '@/types/scrimData';

/** Who played which agent, and how that went. Each row is one player on one agent. */
export function PlayerAgentTable({ rows }: { rows: PlayerAgentSummary[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Players by agent" className="rounded-none-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>Players by agent</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">One row per player and agent. Figures come only from maps that have them; a count in brackets says how many.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
              {['Player', 'Agent', 'Maps', 'Win rate', 'K/D', 'ACS'].map((h, i) => <th key={h} scope="col" className={i < 2 ? 'py-1 pr-3 font-semibold' : 'px-3 text-right font-semibold'}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.userId}-${r.characterId}`} className="border-t border-white/5 text-[13px] tabular-nums">
                <th scope="row" className="max-w-[180px] truncate py-2 pr-3 text-left font-normal text-white">{r.name ?? 'Unknown'}</th>
                <td className="pr-3 text-zinc-300">{resolveAgent(r.characterId)?.displayName ?? 'Unknown agent'}</td>
                <td className="px-3 text-right text-zinc-200">{r.games}</td>
                <td className="px-3 text-right text-zinc-200">{formatPct(r.winRatePct)}</td>
                <td className="px-3 text-right text-zinc-200">{formatNumber(r.kd)}{r.kd != null && r.kdGames < r.games ? <span className="ml-1 text-[10px] text-zinc-500">({r.kdGames})</span> : null}</td>
                <td className="px-3 text-right text-zinc-200">{formatNumber(r.acs, 0)}{r.acs != null && r.statGames < r.games ? <span className="ml-1 text-[10px] text-zinc-500">({r.statGames})</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
