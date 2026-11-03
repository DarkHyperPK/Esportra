import { EYEBROW_CLASS } from '@/components/ui/kit';
import { formatPct, isSmallSample } from '@/services/scrimData/format';
import type { ScrimMapPicks } from '@/schemas/scrimMapPicks';

const WHO: Record<ScrimMapPicks['picks']['byPicker'][number]['pickedBy'], string> = { you: 'Maps you picked', opponent: 'Maps the opponent picked', decider: 'Decider maps' };

function Results({ picks }: { picks: ScrimMapPicks['picks'] }) {
  if (picks.byPicker.length === 0) return null;
  return (
    <section aria-label="Results by who chose the map" className="rounded-none-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>Results by who chose the map</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {picks.byPicker.map((p) => (
          <li key={p.pickedBy} className="rounded-none-none border border-white/5 p-3">
            <p className="text-[12px] text-zinc-400">{WHO[p.pickedBy]}</p>
            <p className="mt-1 text-[20px] font-bold tabular-nums text-white">{p.wins}–{p.games - p.wins}</p>
            <p className="text-[12px] text-zinc-400">{formatPct(p.winRatePct)} of maps · {formatPct(p.roundWinRatePct)} of rounds</p>
            {isSmallSample(p.games) && <p className="mt-1 text-[11px] text-zinc-500">Small sample: {p.games} {p.games === 1 ? 'map' : 'maps'}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Table({ picks }: { picks: ScrimMapPicks['picks'] }) {
  return (
    <section aria-label="Map picks and bans" className="rounded-none-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>Picks and bans by map</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">Counted from scrims whose map veto finished. A decider is the map left after the picks and bans.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
              {['Map', 'You picked', 'You banned', 'They picked', 'They banned', 'Decider', 'Played'].map((h, i) => <th key={h} scope="col" className={i === 0 ? 'py-1 pr-3 font-semibold' : 'whitespace-nowrap px-3 text-right font-semibold'}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {picks.maps.map((m) => (
              <tr key={m.map} className="border-t border-white/5 text-[13px] tabular-nums">
                <th scope="row" className="py-2 pr-3 text-left font-normal text-white">{m.map}</th>
                {[m.youPicked, m.youBanned, m.theyPicked, m.theyBanned, m.decider, m.played].map((v, i) => <td key={i} className={`px-3 text-right ${v === 0 ? 'text-zinc-600' : 'text-zinc-200'}`}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {picks.yourSideChoices.length > 0 && (
        <p className="mt-3 text-[12px] text-zinc-400">When you chose the side after an opponent pick: {picks.yourSideChoices.map((s) => `${s.side} ${s.count}`).join(' · ')}.</p>
      )}
    </section>
  );
}

/** The picks table and the results by who chose the map, for a team or for one scrim partner. */
export function MapPicksView({ picks }: { picks: ScrimMapPicks['picks'] }) {
  return (
    <div className="space-y-4">
      <Table picks={picks} />
      <Results picks={picks} />
    </div>
  );
}
