import { resolveAgent } from '@/lib/valorantAgents';
import { NO_VALUE, formatNumber, formatPct } from '@/services/scrimData/format';
import type { ReportPlayer } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

const COLS = ['ACS', 'K', 'D', 'A', 'K/D', 'ADR', 'HS%', 'KAST', 'FK', 'FD', 'Dmg %'];

function Row({ p }: { p: ReportPlayer }) {
  const agent = resolveAgent(p.agent);
  const cells = [formatNumber(p.acs, 0), p.kills, p.deaths, p.assists, formatNumber(p.kd), formatNumber(p.adr, 0), formatPct(p.hsPct), formatPct(p.kast), p.firstKills, p.firstDeaths, formatPct(p.damageShare)];
  return (
    <tr className="border-t border-white/5">
      <th scope="row" className="sticky left-0 z-[1] max-w-[200px] bg-[#0c0c0f] px-3 py-2 text-left font-normal">
        <span className="flex min-w-0 items-center gap-2">
          {agent ? <img src={agent.iconUrl} alt={agent.displayName} className="h-7 w-7 shrink-0 rounded-none-none" loading="lazy" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-none-none bg-white/5 text-[10px] text-zinc-500">?</span>}
          <span className="truncate text-[13px] text-white">{p.name}</span>
          {p.tag && <span className="shrink-0 text-[11px] text-zinc-500">#{p.tag}</span>}
        </span>
      </th>
      {cells.map((c, i) => <td key={COLS[i]} className="whitespace-nowrap px-3 py-2 text-right text-[13px] tabular-nums text-zinc-200">{c ?? NO_VALUE}</td>)}
    </tr>
  );
}

function Table({ title, players }: { title: string; players: ReportPlayer[] }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-semibold text-zinc-400">{title}</p>
      <div className="overflow-x-auto rounded-none-none border border-white/5">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
              <th scope="col" className="sticky left-0 z-[1] bg-[#0c0c0f] px-3 py-2 text-left font-semibold">Player</th>
              {COLS.map((c) => <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 text-right font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>{players.map((p) => <Row key={p.key} p={p} />)}</tbody>
        </table>
      </div>
    </div>
  );
}

/** Both teams of this one match. Opponents are shown by name for this match only, as in the match history. */
export function PlayerTable({ players }: { players: ReportPlayer[] }) {
  return (
    <ReportSection title="Scoreboard" note="Scores are Riot’s totals for this map. KAST counts rounds with a kill, assist, survival or trade. Dmg % is the player’s share of their team’s damage.">
      <div className="space-y-4">
        <Table title="Your team" players={players.filter((p) => p.mine)} />
        <Table title="Opponent" players={players.filter((p) => !p.mine)} />
      </div>
    </ReportSection>
  );
}
