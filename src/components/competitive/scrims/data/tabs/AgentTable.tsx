import { EYEBROW_CLASS } from '@/components/ui/kit';
import { resolveAgent } from '@/lib/valorantAgents';
import { formatNumber, formatPct, isSmallSample } from '@/services/scrimData/format';
import type { AgentSummary } from '@/types/scrimData';

function AgentCell({ id }: { id: string }) {
  const agent = resolveAgent(id);
  return (
    <span className="flex min-w-0 items-center gap-2">
      {agent ? <img src={agent.iconUrl} alt="" className="h-7 w-7 shrink-0 rounded-none" loading="lazy" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-none bg-white/5 text-[10px] text-zinc-500">?</span>}
      <span className="truncate text-[13px] text-white">{agent?.displayName ?? 'Unknown agent'}</span>
    </span>
  );
}

/** Each agent the team has played: how often, how those maps went, and the figures from the maps that provide them. */
export function AgentTable({ agents }: { agents: AgentSummary[] }) {
  if (agents.length === 0) return null;
  return (
    <section aria-label="Agents" className="rounded-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS} title="Results are for maps where the agent was in play, not proof the agent made the difference. K/D and ACS use only the maps that have them, and the count is shown.">Agents</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
              {['Agent', 'Maps', 'Win rate', 'K/D', 'ACS'].map((h, i) => <th key={h} scope="col" className={i === 0 ? 'py-1 pr-3 font-semibold' : 'px-3 text-right font-semibold'}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => {
              return (
                <tr key={a.characterId} className="border-t border-white/5 text-[13px] tabular-nums">
                  <th scope="row" className="py-2 pr-3 text-left font-normal"><AgentCell id={a.characterId} /></th>
                  <td className="px-3 text-right text-zinc-200">{a.games}{isSmallSample(a.games) ? <span className="ml-1 text-[10px] text-zinc-500">small</span> : null}</td>
                  <td className="px-3 text-right text-zinc-200">{formatPct(a.winRatePct)}</td>
                  <td className="px-3 text-right text-zinc-200">{formatNumber(a.kd)}{a.kd != null && a.kdGames < a.games ? <span className="ml-1 text-[10px] text-zinc-500">({a.kdGames})</span> : null}</td>
                  <td className="px-3 text-right text-zinc-200">{formatNumber(a.acs, 0)}{a.acs != null && a.statGames < a.games ? <span className="ml-1 text-[10px] text-zinc-500">({a.statGames})</span> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
