import { cn } from '@/lib/utils';
import { resolveAgent } from '@/lib/valorantAgents';
import type { TimelinePlayer, TimelineRound } from '@/schemas/scrimTimeline';
import { killArt, SPIKE_ICON, type KillCatalog } from '@/services/scrimInsights/assets';
import { clock, roundEvents, type RoundEvent } from '@/services/scrimInsights/timeline';

interface Props { round: TimelineRound; players: TimelinePlayer[]; assets: KillCatalog; selected: string | null; onSelect: (id: string) => void }

const metres = (a: { x: number; y: number } | undefined, b: { x: number | null; y: number | null }): string =>
  a && b.x != null && b.y != null ? `${Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 100)}m` : '';

function Agent({ player }: { player: TimelinePlayer | undefined }) {
  const agent = resolveAgent(player?.agent);
  return agent
    ? <img src={agent.iconUrl} alt={agent.displayName} title={player?.name} className="h-8 w-8 rounded-none" loading="lazy" />
    : <span title={player?.name} className="grid h-8 w-8 place-items-center bg-white/5 text-[10px] text-zinc-500">?</span>;
}

function Row({ e, round, players, assets }: { e: RoundEvent; round: TimelineRound; players: TimelinePlayer[]; assets: KillCatalog }) {
  const by = (key: string | null) => players.find((p) => p.key === key);
  if (e.kind !== 'kill') {
    const who = by(e.kind === 'plant' ? round.planter : round.defuser);
    return (
      <>
        <img src={SPIKE_ICON} alt="" className="h-6 w-8 object-contain" />
        <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-200">{`${e.kind === 'plant' ? 'Spike planted' : 'Spike defused'}${e.kind === 'plant' && round.plantSite ? ` · ${round.plantSite}` : ''}${who ? ` · ${who.name}` : ''}`}</span>
      </>
    );
  }
  const k = e.kill;
  const killer = by(k.killer);
  const art = killArt(k, killer?.agent, assets);
  return (
    <>
      <Agent player={killer} />
      <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
        {art.src ? <img src={art.src} alt={art.label} title={art.label} className={cn('h-5 max-w-[64px] object-contain', art.silhouette && 'brightness-200')} loading="lazy" /> : <span className="text-[12px] text-zinc-400">{art.label}</span>}
        <span className="text-[11px] tabular-nums text-zinc-500">{metres(k.positions.find((p) => p.key === k.killer), { x: k.victimX, y: k.victimY })}</span>
      </span>
      <Agent player={by(k.victim)} />
    </>
  );
}

/** Every event of the round in order, like the scoreboard's event log: who killed whom with what, the plant and the defuse. Click one to stage it on the minimap. */
export function EventLog({ round, players, assets, selected, onSelect }: Props) {
  const events = roundEvents(round);
  const mine = new Set(players.filter((p) => p.mine).map((p) => p.key));
  if (events.length === 0) return <p className="text-[13px] text-zinc-500">No events recorded in this round.</p>;
  return (
    <ul className="max-h-[620px] divide-y divide-white/[0.06] overflow-y-auto border border-white/[0.06]" aria-label="Round events">
      {events.map((e) => {
        const ally = e.kind === 'kill' ? (e.kill.killer ? mine.has(e.kill.killer) : !mine.has(e.kill.victim)) : e.kind === 'plant' ? !!round.planter && mine.has(round.planter) : !!round.defuser && mine.has(round.defuser);
        return (
          <li key={e.id}>
            <button type="button" aria-pressed={selected === e.id} onClick={() => onSelect(e.id)}
              aria-label={e.kind === 'kill' ? `Kill at ${clock(e.ms)}` : `${e.kind === 'plant' ? 'Plant' : 'Defuse'} at ${clock(e.ms)}`}
              className={cn('flex w-full items-center gap-3 border-l-2 px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                ally ? 'border-emerald-400' : 'border-rose-400', selected === e.id ? 'bg-white/10' : 'hover:bg-white/[0.04]')}>
              <span className="w-9 shrink-0 text-[11px] tabular-nums text-zinc-400" aria-hidden>{clock(e.ms)}</span>
              <Row e={e} round={round} players={players} assets={assets} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
