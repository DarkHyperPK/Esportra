import { EYEBROW_CLASS, StatusPill } from '@/components/ui/kit';
import { formatPct, gameDate } from '@/services/scrimData/format';
import { mapSignalExplanation, practiceSummary, rangeText, signalView } from '@/services/scrimData/presentation';
import type { MapIntel } from '@/types/scrimData';

interface Props {
  maps: MapIntel[];
  unplayed: string[];
  minSample: number;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</dt>
      <dd className="tabular-nums text-zinc-200">{value}</dd>
    </div>
  );
}

function MapRow({ m }: { m: MapIntel }) {
  const signal = signalView(m.signal);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-semibold text-white">{m.map} <span className="font-normal text-zinc-500">· {m.games} {m.games === 1 ? 'map' : 'maps'}</span></p>
        <StatusPill label={signal.label} tone={signal.tone} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-5">
        <Stat label="Win rate" value={`${formatPct(m.winRatePct)} (${m.wins} won)`} />
        <Stat label="Plausible range" value={rangeText(m.winLowPct, m.winHighPct)} />
        <Stat label="Round win rate" value={formatPct(m.roundWinRatePct)} />
        <Stat label="Attack rounds" value={m.attack.played > 0 ? `${formatPct(m.attack.pct)} of ${m.attack.played}` : '—'} />
        <Stat label="Defense rounds" value={m.defense.played > 0 ? `${formatPct(m.defense.pct)} of ${m.defense.played}` : '—'} />
      </dl>
      <p className="mt-1 text-[11px] text-zinc-600">Last played {gameDate(m.lastPlayed)}</p>
    </li>
  );
}

/** The map pool with the evidence behind every label, so a few games never read as a verdict. */
export function MapPoolPanel({ maps, unplayed, minSample }: Props) {
  if (maps.length === 0 && unplayed.length === 0) return null;
  const { most, least } = practiceSummary(maps, unplayed);
  return (
    <section aria-label="Map pool" className="rounded-none-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>Map pool</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{mapSignalExplanation(minSample)}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">Attack and defense come from auto-fetched maps only; screenshot and score-only maps have no round-by-round data.</p>
      {most && <p className="mt-2 text-[12px] text-zinc-400">Most practised: <span className="text-zinc-200">{most}</span>{least && least !== most ? <> · Least practised: <span className="text-zinc-200">{least}</span></> : null}</p>}
      <ul className="mt-2 divide-y divide-white/5">{maps.map((m) => <MapRow key={m.mapId} m={m} />)}</ul>
      {unplayed.length > 0 && <p className="mt-3 text-[12px] text-zinc-500">No confirmed maps on: {unplayed.join(', ')}.</p>}
    </section>
  );
}
