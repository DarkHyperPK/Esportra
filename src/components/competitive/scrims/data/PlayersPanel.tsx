import { EYEBROW_CLASS } from '@/components/ui/kit';
import { resolveAgent } from '@/lib/valorantAgents';
import { formatNumber, formatPct } from '@/services/scrimData/format';
import type { PlayerSummary } from '@/types/scrimData';

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <dt className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</dt>
      <dd className="tabular-nums text-zinc-200">{value}</dd>
    </div>
  );
}

function Agents({ agents }: { agents: PlayerSummary['agents'] }) {
  if (agents.length === 0) return null;
  return (
    <ul className="flex gap-1.5" aria-label="Most played agents">
      {agents.slice(0, 3).map((a) => {
        const agent = resolveAgent(a.characterId);
        return (
          <li key={a.characterId} className="flex items-center gap-1 text-[11px] text-zinc-400">
            {agent ? <img src={agent.iconUrl} alt={agent.displayName} className="h-6 w-6 rounded-none" loading="lazy" /> : <span aria-hidden className="grid h-6 w-6 place-items-center rounded-none bg-white/5 text-[10px]">?</span>}
            ×{a.games}
          </li>
        );
      })}
    </ul>
  );
}

function Player({ p }: { p: PlayerSummary }) {
  const of = (n: number) => `from ${n} of ${p.games} maps`;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-semibold text-white">
          {p.name ?? 'Player'} <span className="font-normal text-zinc-500">· {p.games} {p.games === 1 ? 'map' : 'maps'} · {formatPct(p.winRatePct)} won</span>
        </p>
        <Agents agents={p.agents} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
        <Stat label="ACS" value={formatNumber(p.acs, 0)} title={p.acs != null ? of(p.statGames) : undefined} />
        <Stat label="K/D" value={formatNumber(p.kd)} title={p.kd != null ? of(p.kdaGames) : undefined} />
        <Stat label="ADR" value={formatNumber(p.adr, 0)} />
        <Stat label="Headshot %" value={formatPct(p.hsPct)} />
      </dl>
    </li>
  );
}

/** Each roster player across the team's scrims. A figure uses only the maps that provide it, and says how many. */
export function PlayersPanel({ players }: { players: PlayerSummary[] }) {
  if (players.length === 0) return null;
  return (
    <section aria-label="Players" className="rounded-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS} title="Only maps with player data appear here. Averages are weighted by rounds. Headshot % is the share of hits that landed on the head (as the screenshot or Riot reports it), not aim accuracy. First deaths are only recorded for auto-fetched maps.">Players</h3>
      <ul className="mt-2 divide-y divide-white/5">{players.map((p) => <Player key={p.userId} p={p} />)}</ul>
    </section>
  );
}
