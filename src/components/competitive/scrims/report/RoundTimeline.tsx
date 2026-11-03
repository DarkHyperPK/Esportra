import { cn } from '@/lib/utils';
import { END_LABEL, ROUND_END_ICON, SPIKE_ICON, roundEnd, roundSentence } from '@/services/scrimInsights/assets';
import { rateText } from '@/services/scrimInsights/present';
import type { InsightsReport, ReportRound } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

function Cell({ r }: { r: ReportRound }) {
  const end = roundEnd(r.resultCode);
  const icon = ROUND_END_ICON[end];
  const sentence = roundSentence(r);
  const won = r.won === true;
  return (
    <li tabIndex={0} aria-label={sentence} title={sentence}
      className={cn('relative flex w-10 shrink-0 flex-col items-center gap-1 border-t-2 bg-[#0b0b0d] pb-1.5 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        r.won === null ? 'border-white/10' : won ? 'border-[#34d399]' : 'border-[#f87171]')}>
      <span className="text-[10px] font-black tabular-nums text-zinc-500">{r.num}</span>
      <span className={cn('grid h-7 w-7 place-items-center', r.won === null ? 'opacity-30' : won ? 'bg-[#34d399]/15' : 'bg-[#f87171]/15')}>
        {icon ? <img src={icon} alt="" className="h-5 w-5 object-contain" style={{ filter: won ? 'drop-shadow(0 0 0 #34d399)' : undefined, opacity: won ? 1 : 0.7 }} /> : <span className="text-[9px] font-black text-zinc-400">{end === 'surrender' ? 'FF' : '–'}</span>}
      </span>
      <span className="grid h-4 place-items-center">{r.plantSite ? <img src={SPIKE_ICON} alt="" className="h-3.5 w-3.5 object-contain" /> : null}</span>
    </li>
  );
}

function Half({ title, rounds }: { title: string; rounds: ReportRound[] }) {
  if (rounds.length === 0) return null;
  const side = rounds[0].myRole;
  const last = rounds[rounds.length - 1];
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
        {title}{side ? <span className="text-zinc-500">· you {side === 'attack' ? 'attacked' : 'defended'}</span> : null}
        <span className="ml-auto text-[13px] font-black tracking-normal text-white tabular-nums">{last.myScore}–{last.theirScore}</span>
      </p>
      <ol className="flex flex-wrap gap-1.5" aria-label={title}>{rounds.map((r) => <Cell key={r.num} r={r} />)}</ol>
    </div>
  );
}

const LEGEND = ['elimination', 'detonated', 'defused', 'timeout'] as const;

/** Every round as the game shows it: how it ended (the game's own icons), who won it, which side you played and where the spike went down. */
export function RoundTimeline({ report }: { report: InsightsReport }) {
  const { rounds, streaks, halves } = report;
  return (
    <ReportSection title="Rounds" note="Green is a round your team won, red the opponent’s. The icon is how the round ended; the spike marks a plant. Hover or focus a round for the detail.">
      <div className="space-y-4">
        <Half title="First half" rounds={rounds.filter((r) => r.num <= 12)} />
        <Half title="Second half" rounds={rounds.filter((r) => r.num > 12 && r.num <= 24)} />
        <Half title="Overtime" rounds={rounds.filter((r) => r.num > 24)} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500" aria-label="Legend">
        {LEGEND.map((end) => <li key={end} className="flex items-center gap-1.5"><img src={ROUND_END_ICON[end]} alt="" className="h-3.5 w-3.5 object-contain opacity-70" />{END_LABEL[end]}</li>)}
        <li className="flex items-center gap-1.5"><img src={SPIKE_ICON} alt="" className="h-3.5 w-3.5 object-contain" />Spike planted</li>
      </ul>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-zinc-400 sm:grid-cols-4">
        <div><dt className="inline">First half: </dt><dd className="inline text-zinc-200">{rateText(halves.first)}</dd></div>
        <div><dt className="inline">Second half: </dt><dd className="inline text-zinc-200">{rateText(halves.second)}</dd></div>
        <div><dt className="inline">Longest win streak: </dt><dd className="inline text-zinc-200">{streaks.longestWin}</dd></div>
        <div><dt className="inline">Longest loss streak: </dt><dd className="inline text-zinc-200">{streaks.longestLoss}</dd></div>
      </dl>
    </ReportSection>
  );
}
