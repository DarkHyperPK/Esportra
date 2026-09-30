import type { TournamentProposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { CAPTION, NUMBER } from './docStyles';
import { TermsList } from './TermsList';
import { TierBand } from './TierBand';

type Tier = TournamentProposal['tiers'][number];

function TierColumn({ doc, tier, previous }: { doc: TournamentProposal; tier: Tier; previous?: Tier }) {
  return (
    <article className="pd-avoid flex flex-col border-l border-[color:var(--pd-line)] pl-6 first:border-l-0 first:pl-0">
      <p className={CAPTION}>{tier.name}</p>
      <p className={`${NUMBER} mt-4 text-[2.6rem] leading-none md:text-5xl print:text-[2.6rem]`}>
        {tier.price.toLocaleString('en-US')}
      </p>
      <p className={`${CAPTION} mt-2`}>{tier.currency}</p>
      <ul className="mt-8 space-y-3 print:mt-6 print:space-y-2">
        {tier.includesPrevious && previous && (
          <li className="text-[13px] leading-snug text-[color:var(--pd-hint)]">All of {previous.name}, plus</li>
        )}
        {tier.features.filter((f) => f.trim()).map((feature, i) => (
          <li key={`${i}-${feature}`} className="text-[14px] leading-snug text-[color:var(--pd-label)]">{fillTokens(feature, doc)}</li>
        ))}
      </ul>
    </article>
  );
}

const COLS: Record<number, string> = {
  1: 'grid-cols-1', 2: 'sm:grid-cols-2 print:grid-cols-2', 3: 'sm:grid-cols-3 print:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4', 5: 'sm:grid-cols-3 print:grid-cols-3',
};

export function TournamentPackages({ doc, number }: { doc: TournamentProposal; number: string }) {
  if (doc.tiers.length === 0) return null;
  const indexed = doc.tiers.map((tier, i) => ({ tier, previous: doc.tiers[i - 1] }));
  const standard = indexed.filter(({ tier }) => !tier.featured);
  const featured = indexed.filter(({ tier }) => tier.featured);
  return (
    <DocSection doc={doc} number={number} anchor="tiers" eyebrow="Packages" title="Choose your [presence.]">
      {standard.length > 0 && (
        <div className={`grid gap-y-10 ${COLS[standard.length] ?? 'sm:grid-cols-3 print:grid-cols-3'}`}>
          {standard.map(({ tier, previous }, i) => <TierColumn key={i} doc={doc} tier={tier} previous={previous} />)}
        </div>
      )}
      <div className="mt-12 space-y-6 print:mt-8">
        {featured.map(({ tier }, i) => (
          <TierBand
            key={i}
            caption={tier.availability}
            name={tier.name}
            summary={tier.tagline}
            price={{ currency: tier.currency, amount: tier.price }}
            points={tier.features.map((f) => fillTokens(f, doc))}
          />
        ))}
      </div>
      <div className="mt-10 print:mt-6">
        <TermsList terms={doc.terms} />
      </div>
    </DocSection>
  );
}
