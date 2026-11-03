import { useState } from 'react';
import { cn } from '@/lib/utils';
import { resolveAgent } from '@/lib/valorantAgents';
import { NO_VALUE } from '@/services/scrimData/format';
import { killArt, type KillCatalog } from '@/services/scrimInsights/assets';
import { roundClock } from '@/services/scrimInsights/present';
import type { InsightsReport, ReportPlayer } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

function Who({ p, mine }: { p: ReportPlayer | undefined; mine: boolean }) {
  const agent = resolveAgent(p?.agent);
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', mine ? 'text-emerald-200' : 'text-rose-200')}>
      {agent ? <img src={agent.iconUrl} alt={agent.displayName} title={agent.displayName} className="h-6 w-6 shrink-0 rounded-none" loading="lazy" /> : <span className="h-6 w-6 shrink-0 rounded-none bg-white/5" aria-hidden />}
      <span className="truncate text-[13px]">{p?.name ?? NO_VALUE}</span>
    </span>
  );
}

/** Who killed whom, round by round: the killers' and victims' agents, and the weapon or ability that did it. */
export function KillFeedPanel({ report, assets }: { report: InsightsReport; assets: KillCatalog }) {
  const rounds = [...new Set(report.kills.map((k) => k.round))];
  const [round, setRound] = useState<number | null>(null);
  const shown = round ?? rounds[0];
  const player = (key: string | null) => report.players.find((p) => p.key === key);
  if (rounds.length === 0) return null;
  return (
    <ReportSection title="Kill feed" note="Green rows are kills by your team. The icon is the weapon or ability that made the kill.">
      <div role="group" aria-label="Choose a round" className="mb-3 flex flex-wrap gap-1.5">
        {rounds.map((r) => (
          <button key={r} type="button" aria-pressed={r === shown} onClick={() => setRound(r)}
            className={cn('h-8 min-w-8 rounded-none border px-2 text-[12px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              r === shown ? 'border-white/40 text-white' : 'border-white/10 text-zinc-400 hover:text-white')}>{r}</button>
        ))}
      </div>
      <ul className="divide-y divide-white/5">
        {report.kills.filter((k) => k.round === shown).map((k) => {
          const killer = player(k.killer);
          const art = killArt(k, killer?.agent, assets);
          return (
            <li key={`${k.round}-${k.ordinal}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="w-10 shrink-0 text-[12px] tabular-nums text-zinc-500">{roundClock(k.roundMs)}</span>
              <Who p={killer} mine={k.killerMine} />
              <span className="flex h-8 min-w-[4.5rem] items-center justify-center border border-white/[0.06] bg-black/30 px-2" title={art.label}>
                {art.src
                  ? <img src={art.src} alt={art.label} className={cn('max-h-5 max-w-[5rem] object-contain', art.silhouette && 'opacity-90')} loading="lazy"
                      onError={(e) => { if (art.fallbackSrc && e.currentTarget.src !== art.fallbackSrc) e.currentTarget.src = art.fallbackSrc; }} />
                  : <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{art.label}</span>}
              </span>
              <Who p={player(k.victim)} mine={!k.killerMine} />
              {k.assistants.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-500">assist
                  {k.assistants.map((a) => { const ag = resolveAgent(player(a)?.agent); return ag ? <img key={a} src={ag.iconUrl} alt={player(a)?.name ?? ag.displayName} title={player(a)?.name ?? ag.displayName} className="h-5 w-5 rounded-none" loading="lazy" /> : null; })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </ReportSection>
  );
}
