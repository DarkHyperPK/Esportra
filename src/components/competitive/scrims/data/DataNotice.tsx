import { InlineNotice } from '@/components/ui/kit';
import { coverageNotes, isSmallSample, sampleLine } from '@/services/scrimData/format';
import type { Coverage } from '@/types/scrimData';

interface Props {
  maps: number;
  from: string | null;
  to: string | null;
  coverage: Coverage;
  truncated: boolean;
}

/** What the figures rest on: how many maps, which dates, how much to trust them, and what is not counted. */
export function DataNotice({ maps, from, to, coverage, truncated }: Props) {
  const notes = coverageNotes(coverage);
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-zinc-400">{sampleLine(maps, from, to)}. Only maps both teams confirmed are counted.</p>
      {isSmallSample(maps) && (
        <InlineNotice tone="neutral">Small sample: with so few maps a single result moves every figure. Treat these as a first look, not a pattern.</InlineNotice>
      )}
      {truncated && <InlineNotice tone="warning">Only the most recent maps are included in these figures.</InlineNotice>}
      {notes.map((n) => <p key={n} className="text-[12px] text-zinc-500">{n}</p>)}
    </div>
  );
}
