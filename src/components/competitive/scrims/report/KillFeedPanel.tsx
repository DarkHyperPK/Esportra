import { useState } from 'react';
import { cn } from '@/lib/utils';
import { NO_VALUE } from '@/services/scrimData/format';
import { assetLabel, roundClock } from '@/services/scrimInsights/present';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

/** Who killed whom, round by round, from Riot's kill record. */
export function KillFeedPanel({ report, weapons }: { report: InsightsReport; weapons?: ReadonlyMap<string, string> }) {
  const rounds = [...new Set(report.kills.map((k) => k.round))];
  const [round, setRound] = useState<number | null>(null);
  const shown = round ?? rounds[0];
  const name = (key: string | null) => (key ? report.players.find((p) => p.key === key)?.name ?? NO_VALUE : 'World');
  if (rounds.length === 0) return null;
  return (
    <ReportSection title="Kill feed" note="Green rows are kills by your team. Weapon is what Riot recorded for the finishing blow.">
      <div role="group" aria-label="Choose a round" className="mb-3 flex flex-wrap gap-1.5">
        {rounds.map((r) => (
          <button key={r} type="button" aria-pressed={r === shown} onClick={() => setRound(r)}
            className={cn('h-8 min-w-8 rounded-md border px-2 text-[12px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              r === shown ? 'border-white/40 text-white' : 'border-white/10 text-zinc-400 hover:text-white')}>{r}</button>
        ))}
      </div>
      <ul className="divide-y divide-white/5 text-[13px]">
        {report.kills.filter((k) => k.round === shown).map((k) => (
          <li key={`${k.round}-${k.ordinal}`} className={cn('flex flex-wrap items-center gap-x-2 py-1.5', k.killerMine ? 'text-emerald-200' : 'text-rose-200')}>
            <span className="w-10 tabular-nums text-zinc-500">{roundClock(k.roundMs)}</span>
            <span className="font-semibold">{name(k.killer)}</span>
            <span className="text-zinc-500">killed</span>
            <span>{name(k.victim)}</span>
            <span className="text-zinc-500">with {assetLabel(k.weapon, weapons)}</span>
            {k.assistants.length > 0 && <span className="text-zinc-500">· assisted by {k.assistants.map(name).join(', ')}</span>}
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}
