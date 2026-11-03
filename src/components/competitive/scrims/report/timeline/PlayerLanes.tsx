import { cn } from '@/lib/utils';
import { resolveAgent } from '@/lib/valorantAgents';
import type { TimelinePlayer, TimelineRound } from '@/schemas/scrimTimeline';
import { axisMax, clock, roundEvents, type RoundEvent } from '@/services/scrimInsights/timeline';

interface Props { round: TimelineRound; players: TimelinePlayer[]; selected: string | null; onSelect: (id: string) => void }

/** Which player an event belongs to on the lanes, and what it is for them. */
function laneEvents(e: RoundEvent, key: string): Array<'kill' | 'death' | 'plant' | 'defuse'> {
  if (e.kind === 'kill') return [e.kill.killer === key ? 'kill' : null, e.kill.victim === key ? 'death' : null].filter((x): x is 'kill' | 'death' => x !== null);
  if (e.kind === 'plant') return e.round.planter === key ? ['plant'] : [];
  return e.round.defuser === key ? ['defuse'] : [];
}

const DOT: Record<string, string> = { kill: 'bg-emerald-400', death: 'bg-rose-500', plant: 'bg-amber-300', defuse: 'bg-sky-400' };

/** One lane per player across the round's clock. Click a marker to stage that moment on the minimap. */
export function PlayerLanes({ round, players, selected, onSelect }: Props) {
  const events = roundEvents(round);
  const max = axisMax(events);
  const ordered = [...players].sort((a, b) => Number(b.mine) - Number(a.mine));
  return (
    <div className="space-y-1" role="list" aria-label="Players timeline">
      {ordered.map((p) => {
        const agent = resolveAgent(p.agent);
        return (
          <div key={p.key} role="listitem" className="flex items-center gap-2">
            <span className={cn('flex w-32 shrink-0 items-center gap-1.5 truncate text-[12px]', p.mine ? 'text-emerald-200' : 'text-rose-200')}>
              {agent && <img src={agent.iconUrl} alt="" className="h-5 w-5 rounded-none" />}
              <span className="truncate">{p.name}</span>
            </span>
            <div className="relative h-7 flex-1 border-y border-white/[0.06] bg-white/[0.02]">
              {events.flatMap((e) => laneEvents(e, p.key).map((what) => (
                <button key={`${e.id}-${what}`} type="button" aria-pressed={selected === e.id} aria-label={`${p.name} ${what} at ${clock(e.ms)}`} title={`${what} · ${clock(e.ms)}`}
                  onClick={() => onSelect(e.id)} style={{ left: `${Math.min(100, ((e.ms ?? 0) / max) * 100)}%` }}
                  className={cn('absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white', DOT[what], selected === e.id && 'ring-2 ring-white')} />
              )))}
            </div>
          </div>
        );
      })}
      <div className="flex justify-between pl-[8.5rem] text-[10px] tabular-nums text-zinc-500" aria-hidden>
        <span>0:00</span><span>{clock(max / 2)}</span><span>{clock(max)}</span>
      </div>
    </div>
  );
}
