import { EYEBROW_CLASS } from '@/components/ui/kit';
import { resolveAgent } from '@/lib/valorantAgents';
import { formatPct } from '@/services/scrimData/format';
import { roleSummary } from '@/services/scrimData/presentation';
import type { CompositionIntel } from '@/types/scrimData';

function Comp({ c }: { c: CompositionIntel }) {
  const names = c.agents.map((a) => resolveAgent(a)?.displayName ?? 'Unknown agent').join(', ');
  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <ul className="flex shrink-0 gap-1" aria-label={`Agents: ${names}`}>
          {c.agents.map((a) => {
            const agent = resolveAgent(a);
            return <li key={a}>{agent ? <img src={agent.iconUrl} alt={agent.displayName} className="h-8 w-8 rounded-none-none" loading="lazy" /> : <span className="grid h-8 w-8 place-items-center rounded-none-none bg-white/5 text-[10px] text-zinc-500">?</span>}</li>;
          })}
        </ul>
        <p className="shrink-0 text-right text-[13px] tabular-nums text-zinc-200">
          {c.wins}–{c.games - c.wins} <span className="text-zinc-500">· {formatPct(c.winRatePct)}</span>
        </p>
      </div>
      <p className="mt-1.5 text-[13px] text-zinc-200">{names}</p>
      <p className="text-[11px] text-zinc-500">{roleSummary(c.agents)}</p>
      <p className="mt-1.5 text-[11px] text-zinc-500">
        {c.maps.map((m) => `${m.map} ${m.wins}/${m.games}`).join(' · ')}
        {c.attack.played > 0 || c.defense.played > 0 ? ` · attack ${formatPct(c.attack.pct)} · defense ${formatPct(c.defense.pct)}` : ''}
      </p>
    </li>
  );
}

/** Which five agents the team has fielded and how those games went. Observed results, not proof one is better. */
export function CompositionPanel({ compositions }: { compositions: CompositionIntel[] }) {
  if (compositions.length === 0) return null;
  return (
    <section aria-label="Compositions" className="rounded-none-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>Compositions</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
        What the team has played and how it went. A composition’s record also reflects the map, the opponent, the side and who was playing, so a higher win rate here is not proof it is better.
      </p>
      <ul className="mt-2 divide-y divide-white/5">{compositions.map((c) => <Comp key={c.agents.join(',')} c={c} />)}</ul>
    </section>
  );
}
