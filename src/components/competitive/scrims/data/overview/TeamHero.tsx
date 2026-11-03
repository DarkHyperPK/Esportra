import { formatPct } from '@/services/scrimData/format';
import type { TeamRatings } from '@/schemas/scrimReport';
import type { TeamReportBody } from '@/types/scrimReport';
import { RatingNumber } from './RatingNumber';

interface Props { team: { name: string; logoUrl: string | null; tag: string | null }; report: TeamReportBody; ratings: TeamRatings | undefined }

function Sparkline({ values }: { values: Array<number | null> }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return null;
  const w = 160;
  const h = 40;
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * w;
  const y = (v: number) => h - (v / 100) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-40" aria-hidden="true">
      <line x1="0" x2={w} y1={y(50)} y2={y(50)} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
      <polyline fill="none" stroke="#f43f5e" strokeWidth="1.5" points={pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} />
      <circle cx={x(pts[pts.length - 1].i)} cy={y(pts[pts.length - 1].v)} r="2.5" fill="#f43f5e" />
    </svg>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-1 font-heading text-[20px] font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

/** The team at a glance: who, the record, and the Esportra rating with how it moved map by map. */
export function TeamHero({ team, report, ratings }: Props) {
  const r = report;
  return (
    <section aria-label="Team overview" className="relative overflow-hidden border border-white/[0.06] bg-[#0a0a0c]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
      <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-12">
        <div className="flex min-w-0 items-center gap-5">
          {team.logoUrl
            ? <img src={team.logoUrl} alt="" className="h-16 w-16 shrink-0 border border-white/10 object-cover" />
            : <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center border border-white/10 bg-white/[0.04] font-mono text-[18px] text-white/60">{team.name.slice(0, 2).toUpperCase()}</span>}
          <div className="min-w-0">
            <h2 className="truncate font-heading text-[26px] font-black uppercase leading-none tracking-wide text-white sm:text-[32px]">{team.name}</h2>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
              {[team.tag, `${r.sample.maps} ${r.sample.maps === 1 ? 'map' : 'maps'}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-8">
          <Fact label="Record" value={`${r.wins}–${r.losses}`} />
          <Fact label="Maps won" value={formatPct(r.winRatePct)} />
          <Fact label="Rounds won" value={formatPct(r.roundWinPct)} />
        </div>
        <div className="flex items-end gap-5">
          <RatingNumber rating={ratings?.team} />
          <Sparkline values={(ratings?.byMap ?? []).map((m) => m.value)} />
        </div>
      </div>
    </section>
  );
}
