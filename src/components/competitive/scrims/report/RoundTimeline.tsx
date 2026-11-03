import { cn } from '@/lib/utils';
import { rateText } from '@/services/scrimInsights/present';
import type { InsightsReport } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

/** Every round at a glance: won or lost, attack or defense, planted, and the running score. */
export function RoundTimeline({ report }: { report: InsightsReport }) {
  const { rounds, streaks, halves } = report;
  return (
    <ReportSection title="Rounds" note="Green is a round your team won. A is attack, D is defense; a dot marks a spike plant.">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5" aria-label="Round results">
        {rounds.map((r) => (
          <li key={r.num} title={`Round ${r.num}: ${r.won === null ? 'no result' : r.won ? 'won' : 'lost'} · ${r.myScore}–${r.theirScore}`}
            className={cn('flex h-10 flex-col items-center justify-center rounded-md border text-[10px] font-semibold tabular-nums',
              r.won === true ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : r.won === false ? 'border-rose-400/40 bg-rose-400/10 text-rose-200' : 'border-white/10 text-zinc-500')}>
            <span>{r.num}</span>
            <span className="text-[9px] opacity-80">{r.myRole === 'attack' ? 'A' : r.myRole === 'defense' ? 'D' : ''}{r.plantSite ? ' •' : ''}</span>
          </li>
        ))}
      </ol>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-zinc-400 sm:grid-cols-4">
        <div><dt className="inline">First half: </dt><dd className="inline text-zinc-200">{rateText(halves.first)}</dd></div>
        <div><dt className="inline">Second half: </dt><dd className="inline text-zinc-200">{rateText(halves.second)}</dd></div>
        <div><dt className="inline">Longest win streak: </dt><dd className="inline text-zinc-200">{streaks.longestWin}</dd></div>
        <div><dt className="inline">Longest loss streak: </dt><dd className="inline text-zinc-200">{streaks.longestLoss}</dd></div>
      </dl>
    </ReportSection>
  );
}
