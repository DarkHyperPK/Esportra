import { coverageNotes, isSmallSample, sampleLine } from '@/services/scrimData/format';
import type { Coverage } from '@/types/scrimData';

interface Props {
  maps: number;
  from: string | null;
  to: string | null;
  coverage: Coverage;
  truncated: boolean;
}

/** Short tags for what is not fully counted; the full sentence is the tag's hover text. */
function tags(c: Coverage, truncated: boolean): Array<{ label: string; detail: string }> {
  const notes = coverageNotes(c);
  const find = (needle: string) => notes.find((n) => n.includes(needle)) ?? '';
  const out: Array<{ label: string; detail: string }> = [];
  if (c.queueGames > 0) out.push({ label: `${c.queueGames} ranked`, detail: find('matchmade') });
  if (c.riotPending > 0) out.push({ label: `${c.riotPending} waiting for Riot`, detail: find('waiting for Riot') });
  if (c.riotNotVerified > 0) out.push({ label: `${c.riotNotVerified} not matched`, detail: find('not match') });
  if (c.awaitingConfirmation > 0) out.push({ label: `${c.awaitingConfirmation} unconfirmed`, detail: find('confirm') });
  if (c.disputed > 0) out.push({ label: `${c.disputed} disputed`, detail: find('disputed') });
  if (truncated) out.push({ label: 'latest maps only', detail: 'Only the most recent maps are included in these figures.' });
  return out;
}

/** What the figures rest on, in one line: maps, dates, sample size, and short tags for anything not fully counted. */
export function DataNotice({ maps, from, to, coverage, truncated }: Props) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-zinc-400" title="Only maps both teams confirmed are counted.">
      <span>{sampleLine(maps, from, to)}{isSmallSample(maps) ? ' · small sample' : ''}</span>
      {tags(coverage, truncated).map((t) => (
        <span key={t.label} title={t.detail} className="rounded-md border border-white/[0.08] px-1.5 py-0.5 text-[11px] text-zinc-500">{t.label}</span>
      ))}
    </p>
  );
}
