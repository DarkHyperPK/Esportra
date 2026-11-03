import { Bomb, Flag, HelpCircle, Shield, Skull, Swords, Timer, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roundEnd, roundSentence, type RoundEnd } from '@/services/scrimInsights/assets';
import { rateText } from '@/services/scrimInsights/present';
import type { InsightsReport, ReportRound } from '@/types/scrimInsights';
import { ReportSection } from './ReportSection';

const END_ICON: Record<RoundEnd, LucideIcon> = { elimination: Skull, detonated: Bomb, defused: Wrench, timeout: Timer, surrender: Flag, unknown: HelpCircle };


function Cell({ r }: { r: ReportRound }) {
  const end = roundEnd(r.resultCode);
  const Icon = END_ICON[end];
  const sentence = roundSentence(r);
  return (
    <li tabIndex={0} aria-label={sentence} title={sentence}
      className={cn('flex w-10 shrink-0 flex-col items-center gap-1 rounded-md border px-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        r.won === true ? 'border-emerald-400/30 bg-emerald-400/[0.07]' : r.won === false ? 'border-rose-400/30 bg-rose-400/[0.07]' : 'border-white/10')}>
      <span className="text-[10px] tabular-nums text-zinc-500">{r.num}</span>
      <span className={cn('grid h-7 w-7 place-items-center rounded', r.won === true ? 'bg-emerald-400/20 text-emerald-200' : r.won === false ? 'bg-rose-400/20 text-rose-200' : 'bg-white/5 text-zinc-500')}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="grid h-4 place-items-center text-amber-300">{r.plantSite ? <Bomb className="h-3 w-3" aria-hidden /> : null}</span>
    </li>
  );
}

function Half({ title, rounds }: { title: string; rounds: ReportRound[] }) {
  if (rounds.length === 0) return null;
  const side = rounds[0].myRole;
  const last = rounds[rounds.length - 1];
  const SideIcon = side === 'attack' ? Swords : Shield;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-zinc-400">
        {side && <SideIcon className="h-3.5 w-3.5" aria-hidden />}
        {title}{side ? ` · you ${side === 'attack' ? 'attacked' : 'defended'}` : ''}
        <span className="ml-auto font-normal tabular-nums text-zinc-500">{last.myScore}–{last.theirScore}</span>
      </p>
      <ol className="flex flex-wrap gap-1.5" aria-label={title}>{rounds.map((r) => <Cell key={r.num} r={r} />)}</ol>
    </div>
  );
}

const LEGEND: Array<[RoundEnd, string]> = [['elimination', 'Elimination'], ['detonated', 'Spike detonated'], ['defused', 'Spike defused'], ['timeout', 'Time ran out']];

/** Every round as the game shows it: how it ended, who won it, which side you were on and where the spike was planted, half by half. */
export function RoundTimeline({ report }: { report: InsightsReport }) {
  const { rounds, streaks, halves } = report;
  return (
    <ReportSection title="Rounds" note="Green rounds are yours, red are the opponent’s. The icon is how the round ended; a spike marks a plant. Hover or focus a round for the full detail.">
      <div className="space-y-4">
        <Half title="First half" rounds={rounds.filter((r) => r.num <= 12)} />
        <Half title="Second half" rounds={rounds.filter((r) => r.num > 12 && r.num <= 24)} />
        <Half title="Overtime" rounds={rounds.filter((r) => r.num > 24)} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500" aria-label="Legend">
        {LEGEND.map(([end, label]) => { const Icon = END_ICON[end]; return <li key={end} className="flex items-center gap-1"><Icon className="h-3 w-3" aria-hidden />{label}</li>; })}
        <li className="flex items-center gap-1 text-amber-300/80"><Bomb className="h-3 w-3" aria-hidden />Spike planted</li>
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
