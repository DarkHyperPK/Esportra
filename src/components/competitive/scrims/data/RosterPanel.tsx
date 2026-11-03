import { EYEBROW_CLASS, StatusPill } from '@/components/ui/kit';
import { formatPct } from '@/services/scrimData/format';
import type { RosterIntel } from '@/types/scrimData';

const name = (n: string | null) => n ?? 'Player';
const record = (r: { games: number; wins: number }) => (r.games === 0 ? '—' : `${r.wins}–${r.games - r.wins}`);

/** Lineups, stability, substitutes and pairs. Names people, so it is shown to team members only. */
export function RosterPanel({ roster }: { roster: RosterIntel }) {
  const { stability: s, substitutes: sub } = roster;
  return (
    <section aria-label="Roster" className="space-y-4 rounded-none-none border border-white/[0.06] bg-[#111114] p-4">
      <div>
        <h3 className={EYEBROW_CLASS}>Roster · who played</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-zinc-400">
          {s.gamesWithKnownPlayers} {s.gamesWithKnownPlayers === 1 ? 'map' : 'maps'} with known players · {s.completeLineups} full {s.completeLineups === 1 ? 'lineup' : 'lineups'} ·
          {' '}{s.playersUsed} {s.playersUsed === 1 ? 'player' : 'players'} used
          {s.mostUsedSharePct != null ? ` · the most-used lineup played ${formatPct(s.mostUsedSharePct)} of these games` : ''}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">A player counts toward a lineup when they are matched to your roster (a linked Riot account, or matched on the screenshot). A lineup marked “partial” has fewer than five known players.</p>
      </div>

      <ul className="divide-y divide-white/5">
        {roster.lineups.map((l) => (
          <li key={l.userIds.join(',')} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13px]">
            <span className="min-w-0 flex-1 text-zinc-200">{l.names.map(name).join(', ')} {!l.complete && <StatusPill label="Partial" tone="neutral" className="ml-1 align-middle" />}</span>
            <span className="shrink-0 tabular-nums text-zinc-400">{l.wins}–{l.games - l.wins} · {formatPct(l.winRatePct)} · rounds {formatPct(l.roundWinRatePct)}</span>
          </li>
        ))}
      </ul>

      {(sub.gamesWith > 0) && (
        <p className="text-[12px] leading-relaxed text-zinc-400">
          With a substitute: {record({ games: sub.gamesWith, wins: sub.winsWith })} ({formatPct(sub.winRateWithPct)}) · without: {record({ games: sub.gamesWithout, wins: sub.winsWithout })} ({formatPct(sub.winRateWithoutPct)}).
          <span className="text-zinc-600"> Descriptive only: the games differ in more than the substitute.</span>
        </p>
      )}

      {roster.pairs.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold text-zinc-300">Players together</h4>
          <ul className="mt-1 divide-y divide-white/5">
            {roster.pairs.map((p) => (
              <li key={p.names.join('|')} className="py-2 text-[12px]">
                <p className="text-zinc-200">{p.names.map(name).join(' + ')} <span className="tabular-nums text-zinc-400">· together {record(p.together)}</span></p>
                <p className="text-zinc-500">
                  {name(p.names[0])} without {name(p.names[1])}: {record(p.firstWithoutSecond)} · {name(p.names[1])} without {name(p.names[0])}: {record(p.secondWithoutFirst)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
