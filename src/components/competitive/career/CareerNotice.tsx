import { InlineNotice } from '@/components/ui/kit';
import { isSmallSample, sampleLine } from '@/services/career/format';
import type { CareerSample } from '@/types/career';

interface Props {
  sample: CareerSample;
  /** Plain-words description of who is looking and what they can see. */
  access?: string | null;
  truncated: boolean;
}

/** What the figures rest on: how many games, which dates, and how much to trust them. */
export function CareerNotice({ sample, access, truncated }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-zinc-400">{sampleLine(sample)}. Verified and partly verified Riot custom games only.</p>
      {isSmallSample(sample.matches) && (
        <InlineNotice tone="neutral">Small sample: with so few games a single match moves every figure. Treat these as a first look, not a pattern.</InlineNotice>
      )}
      {truncated && <InlineNotice tone="warning">Only the most recent games are included in these totals.</InlineNotice>}
      {access && <p className="text-[12px] text-zinc-500">{access}</p>}
    </div>
  );
}
