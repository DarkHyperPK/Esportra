import { useState } from 'react';
import { Crosshair, Footprints, Skull, Bomb, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAgent } from '@/lib/valorantAgents';
import { NO_VALUE } from '@/services/scrimData/format';
import { killArt, type KillCatalog, type KillMethod } from '@/services/scrimInsights/assets';
import { roundClock } from '@/services/scrimInsights/present';
import type { InsightsReport, ReportPlayer } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

const FALLBACK_ICON = { spike: Bomb, melee: Crosshair, fall: Footprints, ability: Zap, ultimate: Zap, weapon: Crosshair, other: Skull } as const satisfies Record<KillMethod, unknown>;

function Who({ p, mine }: { p: ReportPlayer | undefined; mine: boolean }) {
  const agent = resolveAgent(p?.agent);
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', mine ? 'text-emerald-200' : 'text-rose-200')}>
      {agent ? <img src={agent.iconUrl} alt={agent.displayName} title={agent.displayName} className="h-6 w-6 shrink-0 rounded-sm" loading="lazy" /> : <span className="h-6 w-6 shrink-0 rounded-sm bg-white/5" aria-hidden />}
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
            className={cn('h-8 min-w-8 rounded-md border px-2 text-[12px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              r === shown ? 'border-white/40 text-white' : 'border-white/10 text-zinc-400 hover:text-white')}>{r}</button>
        ))}
      </div>
      <ul className="divide-y divide-white/5">
        {report.kills.filter((k) => k.round === shown).map((k) => {
          const killer = player(k.killer);
          const art = killArt(k, killer?.agent, assets);
          const Fallback = FALLBACK_ICON[art.method];
          return (
            <li key={`${k.round}-${k.ordinal}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="w-10 shrink-0 text-[12px] tabular-nums text-zinc-500">{roundClock(k.roundMs)}</span>
              <Who p={killer} mine={k.killerMine} />
              <span className="flex h-7 min-w-[3.5rem] items-center justify-center rounded bg-white/[0.04] px-2" title={art.label}>
                {art.src ? <img src={art.src} alt={art.label} className="max-h-5 max-w-[4.5rem] object-contain" loading="lazy" /> : <span className="flex items-center gap-1 text-[11px] text-zinc-300"><Fallback className="h-3.5 w-3.5" aria-hidden />{art.label}</span>}
              </span>
              <Who p={player(k.victim)} mine={!k.killerMine} />
              {k.assistants.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-500">assist
                  {k.assistants.map((a) => { const ag = resolveAgent(player(a)?.agent); return ag ? <img key={a} src={ag.iconUrl} alt={player(a)?.name ?? ag.displayName} title={player(a)?.name ?? ag.displayName} className="h-5 w-5 rounded-sm" loading="lazy" /> : null; })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </ReportSection>
  );
}
