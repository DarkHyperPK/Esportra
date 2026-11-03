import { Link, useSearchParams } from 'react-router-dom';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { useScrimUpNext } from '@/hooks/competitive/useScrimUpNext';
import { RESULT_LABEL, gameDate, scoreLine } from '@/services/scrimData/format';
import { describeUpNext } from '@/services/scrimUpNext';
import type { RecentMap } from '@/types/scrimData';
import type { ReportHighlight } from '@/types/scrimReport';
import { useMapArt } from '../maps/useMapArt';

const PANEL = 'border border-white/[0.06] bg-[#0a0a0c] p-5';

/** The latest scrim map on its splash art, with a link to read it event by event. */
export function LastScrim({ map }: { map: RecentMap | undefined }) {
  const art = useMapArt();
  const [params] = useSearchParams();
  if (!map) return null;
  const splash = map.map ? art(map.map) : null;
  const next = new URLSearchParams(params);
  next.set('tab', 'timeline');
  next.set('map', `${map.sessionId}:${map.gameNumber}`);
  return (
    <section aria-label="Last scrim" className="relative overflow-hidden border border-white/[0.06] bg-[#0a0a0c]">
      {splash && <img src={splash} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" loading="lazy" />}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      <div className="relative p-5">
        <h3 className={EYEBROW_CLASS}>Last scrim</h3>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-heading text-[20px] font-bold text-white">{map.map ?? 'Map'}</p>
            <p className="truncate text-[12px] text-white/55">{`vs ${map.opponent ?? 'Opponent'} · ${gameDate(map.playedAt)}`}</p>
          </div>
          <p className="text-right">
            <span className="block font-heading text-[26px] font-black tabular-nums text-white">{scoreLine(map.roundsWon, map.roundsLost)}</span>
            <span className={cn('font-mono text-[11px] font-bold uppercase', map.result === 'win' ? 'text-emerald-300' : map.result === 'loss' ? 'text-rose-400' : 'text-white/50')}>{RESULT_LABEL[map.result]}</span>
          </p>
        </div>
        {map.tier === 'full' && <Link to={`?${next.toString()}`} className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 underline-offset-4 hover:text-white hover:underline">Open timeline →</Link>}
      </div>
    </section>
  );
}

/** The one thing the team has to do next across its scrims, from the up-next feed. */
export function UpNext({ teamId }: { teamId: string }) {
  const { data } = useScrimUpNext(teamId);
  const item = data?.items[0];
  const d = item ? describeUpNext(item) : null;
  return (
    <section aria-label="Up next" className={PANEL}>
      <h3 className={EYEBROW_CLASS}>Up next</h3>
      {d ? (
        <Link to={d.href} className="mt-3 block hover:opacity-90">
          <p className={cn('font-heading text-[16px] font-bold', d.urgent ? 'text-amber-200' : 'text-white')}>{d.title}</p>
          <p className="mt-0.5 text-[12px] text-white/55">{d.detail}</p>
        </Link>
      ) : (
        <p className="mt-3 text-[13px] text-white/45">Nothing waiting on you.</p>
      )}
    </section>
  );
}

const TONE = { good: 'border-l-emerald-400', watch: 'border-l-amber-300', neutral: 'border-l-white/30' } as const;

/** The three findings that matter most right now, one line each; the evidence is in the hover text. */
export function Focus({ highlights }: { highlights: ReportHighlight[] }) {
  const top = [...highlights].sort((a, b) => (a.tone === 'watch' ? -1 : 0) - (b.tone === 'watch' ? -1 : 0)).slice(0, 3);
  if (top.length === 0) return null;
  return (
    <section aria-label="Focus" className={PANEL}>
      <h3 className={EYEBROW_CLASS}>Focus</h3>
      <ul className="mt-3 space-y-2">
        {top.map((h) => <li key={`${h.kind}-${h.playerId ?? 'team'}`} title={h.detail} className={cn('border-l-2 pl-3 text-[13px] text-white/85', TONE[h.tone])}>{h.title}</li>)}
      </ul>
    </section>
  );
}
