import type { TournamentProposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { BODY, CAPTION, CELL, CELL_RAISED, GRID, NUMBER } from './docStyles';

function TierCard({ doc, index }: { doc: TournamentProposal; index: number }) {
  const tier = doc.tiers[index];
  const previous = index > 0 ? doc.tiers[index - 1] : undefined;
  const features = tier.features.filter((f) => f.trim());
  return (
    <article className={`${tier.featured ? CELL_RAISED : CELL} pd-avoid flex flex-col p-6 md:p-7 print:p-4`}>
      <p className={CAPTION}>{tier.name}</p>
      <p className="mt-1 min-h-[2.75rem] text-[13px] text-[color:var(--pd-muted)]">{tier.tagline}</p>
      <p className={`${CAPTION} mt-6`}>{tier.currency}</p>
      <p className={`${NUMBER} text-4xl leading-none lg:text-[2rem] print:text-[1.6rem]`}>{tier.price.toLocaleString('en-US')}</p>
      <p className={`${CAPTION} mt-3`}>{tier.availability}</p>
      <div className="mt-6 flex-1 border-t border-[color:var(--pd-line)] pt-5">
        {tier.includesPrevious && previous && (
          <p className={`${CAPTION} mb-3`}>Everything in {previous.name}, plus</p>
        )}
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={`${i}-${feature}`} className="flex gap-3 text-[14px] leading-snug text-[color:var(--pd-label)]">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 bg-[color:var(--pd-hint)]" />
              {fillTokens(feature, doc)}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

const LG_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1 print:grid-cols-1',
  2: 'lg:grid-cols-2 print:grid-cols-2',
  3: 'lg:grid-cols-3 print:grid-cols-3',
  4: 'lg:grid-cols-4 print:grid-cols-4',
  5: 'lg:grid-cols-5 print:grid-cols-5',
  6: 'lg:grid-cols-3 print:grid-cols-3',
};

export function TournamentPackages({ doc }: { doc: TournamentProposal }) {
  if (doc.tiers.length === 0) return null;
  return (
    <DocSection number="03" eyebrow="Packages" title="Four ways to be part of it.">
      <p className={`${BODY} -mt-6 mb-10 max-w-2xl md:-mt-10`}>
        Each package covers {doc.event.name || 'the tournament'} and lists exactly what you receive.
      </p>
      <div className={`${GRID} grid-cols-1 sm:grid-cols-2 ${LG_COLS[doc.tiers.length] ?? 'lg:grid-cols-4 print:grid-cols-4'}`}>
        {doc.tiers.map((tier, i) => (
          <TierCard key={`${tier.name}-${i}`} doc={doc} index={i} />
        ))}
      </div>
    </DocSection>
  );
}
