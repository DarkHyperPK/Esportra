import { CoachPanel } from '@/components/competitive/scrims/data/reports/CoachPanel';
import { CoachPlayersTable } from '@/components/competitive/scrims/data/reports/CoachPlayersTable';
import { resolveAgent } from '@/lib/valorantAgents';
import { fromMap } from '@/services/scrimInsights/coach';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

/** The moments that decided this map: clutches, trades, the plant and retake rounds, economy conversion, and each player's part. */
export function DecisivePanel({ report }: { report: InsightsReport }) {
  const coach = report.coach;
  if (!coach) return null;
  const player = (key: string) => report.players.find((p) => p.key === key);
  const rows = coach.players.map((p) => ({ userId: p.key, name: player(p.key)?.name ?? 'Player', maps: 1, ...p }));
  return (
    <div className="space-y-4">
      {coach.clutches.length > 0 && (
        <ReportSection title="Clutches" note="A player left alone against one or more enemies, and whether the round was won.">
          <ul className="divide-y divide-white/[0.06]">
            {coach.clutches.map((c) => {
              const p = player(c.key);
              const agent = resolveAgent(p?.agent);
              return (
                <li key={`${c.round}-${c.key}`} className="flex items-center gap-3 py-2 text-[13px]">
                  <span className="w-16 shrink-0 text-[11px] font-black uppercase tracking-wide text-zinc-500">Round {c.round}</span>
                  {agent ? <img src={agent.iconUrl} alt={agent.displayName} title={agent.displayName} className="h-6 w-6 shrink-0" loading="lazy" /> : <span className="h-6 w-6 shrink-0 bg-white/5" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate text-white">{p?.name ?? 'Player'}</span>
                  <span className="tabular-nums text-zinc-300">1v{c.versus}</span>
                  <span className={c.won ? 'w-12 text-right text-[11px] font-black uppercase text-[#34d399]' : 'w-12 text-right text-[11px] font-black uppercase text-[#f87171]'}>{c.won ? 'Won' : 'Lost'}</span>
                </li>
              );
            })}
          </ul>
        </ReportSection>
      )}
      <CoachPanel view={fromMap(coach)} title="What decided rounds on this map" />
      <CoachPlayersTable rows={rows} />
    </div>
  );
}
