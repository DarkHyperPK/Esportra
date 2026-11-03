import { EYEBROW_CLASS } from '@/components/ui/kit';
import { TIER_LABEL, TIER_MEANING } from '@/services/scrimData/format';
import type { Coverage, DataTier } from '@/types/scrimData';

const TIERS: Array<{ tier: DataTier; count: (c: Coverage) => number; bar: string }> = [
  { tier: 'full', count: (c) => c.full, bar: 'bg-emerald-400/70' },
  { tier: 'screenshot', count: (c) => c.screenshot, bar: 'bg-sky-400/60' },
  { tier: 'score_only', count: (c) => c.scoreOnly, bar: 'bg-zinc-500/60' },
];

/** What the numbers are built from: how many maps have full detail, a screenshot, or just a score. */
export function CoverageSummary({ coverage }: { coverage: Coverage }) {
  return (
    <section aria-label="What your data is built from" className="rounded-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>What your data is built from</h3>
      {coverage.maps > 0 && (
        <div aria-hidden className="mt-3 flex h-2 overflow-hidden rounded-none bg-white/5">
          {TIERS.map(({ tier, count, bar }) => (count(coverage) > 0 ? <span key={tier} className={bar} style={{ width: `${(100 * count(coverage)) / coverage.maps}%` }} /> : null))}
        </div>
      )}
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {TIERS.map(({ tier, count }) => (
          <li key={tier} title={TIER_MEANING[tier]}>
            <p className="font-heading text-xl font-bold tabular-nums text-white">{count(coverage)} <span className="text-[13px] font-normal text-zinc-400">{TIER_LABEL[tier].toLowerCase()}</span></p>
          </li>
        ))}
      </ul>
    </section>
  );
}
