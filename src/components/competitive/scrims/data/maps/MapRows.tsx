import { cn } from '@/lib/utils';
import { formatPct, gameDate } from '@/services/scrimData/format';
import type { ScrimMapPicks } from '@/schemas/scrimMapPicks';
import type { MapIntel } from '@/types/scrimData';

type PickRow = ScrimMapPicks['picks']['maps'][number];

function Figure({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-[14px] font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

const sideText = (s: MapIntel['attack']) => (s.played > 0 ? formatPct(s.pct) : '—');

/** One map per row over its own picture: record, rounds, attack and defense, and how the veto treats it. */
export function MapRows({ maps, picks, artFor }: { maps: MapIntel[]; picks: PickRow[]; artFor: (map: string) => string | null }) {
  const byMap = new Map(picks.map((p) => [p.map.toLowerCase(), p]));
  return (
    <section aria-label="Maps" className="space-y-px border border-white/[0.06] bg-white/[0.06]">
      {maps.map((m) => {
        const art = artFor(m.map);
        const v = byMap.get(m.map.toLowerCase());
        return (
          <article key={m.mapId} className="relative overflow-hidden bg-[#0e0e11]" aria-label={m.map}>
            {art && <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.22]" loading="lazy" />}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e11] via-[#0e0e11]/75 to-transparent" />
            <div className="relative grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-[10rem_repeat(4,minmax(0,1fr))] lg:grid-cols-[12rem_repeat(5,minmax(0,1fr))_minmax(0,1.4fr)]">
              <div className="min-w-0">
                <h3 className="truncate font-heading text-[16px] font-bold text-white">{m.map}</h3>
                <p className="text-[11px] text-zinc-400">{m.games} {m.games === 1 ? 'map' : 'maps'} · last {gameDate(m.lastPlayed)}</p>
              </div>
              <Figure label="Record" value={`${m.wins}–${m.games - m.wins}`} title={`Win rate ${formatPct(m.winRatePct)}`} />
              <Figure label="Rounds" value={formatPct(m.roundWinRatePct)} title={`${m.roundsWon} won, ${m.roundsLost} lost`} />
              <Figure label="Attack" value={sideText(m.attack)} title={m.attack.played ? `${m.attack.won} of ${m.attack.played} rounds` : 'No round data'} />
              <Figure label="Defense" value={sideText(m.defense)} title={m.defense.played ? `${m.defense.won} of ${m.defense.played} rounds` : 'No round data'} />
              <div className={cn('hidden lg:block')} aria-hidden />
              <p className="text-[12px] tabular-nums text-zinc-300 sm:col-span-5 lg:col-span-1" title="From finished map vetoes">
                {v ? <>Picked <b className="text-white">{v.youPicked}</b> · Banned <b className="text-white">{v.youBanned}</b> · Decider <b className="text-white">{v.decider}</b><br /><span className="text-zinc-500">Opponent picked {v.theyPicked} · banned {v.theyBanned}</span></> : <span className="text-zinc-600">No veto data</span>}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
