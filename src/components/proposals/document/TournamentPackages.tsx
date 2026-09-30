import type { TournamentProposal } from '@/schemas/proposal';
import { fillTokens, joinFacts } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { CAPTION, CELL, GRID, NUMBER } from './docStyles';
import { TierBand } from './TierBand';

type Tier = TournamentProposal['tiers'][number];

function leadIn(tiers: Tier[], index: number): string | undefined {
  const previous = index > 0 ? tiers[index - 1] : undefined;
  return tiers[index].includesPrevious && previous ? `Everything in ${previous.name}, plus` : undefined;
}

function TierColumn({ doc, index }: { doc: TournamentProposal; index: number }) {
  const tier = doc.tiers[index];
  const lead = leadIn(doc.tiers, index);
  return (
    <article className={`${CELL} pd-avoid flex flex-col p-6 md:p-7 print:p-5`}>
      <p className={CAPTION}>{joinFacts([tier.name, tier.availability])}</p>
      <p className="mt-2 text-[14px] leading-snug text-[color:var(--pd-muted)]">{tier.tagline}</p>
      <p className={`${CAPTION} mt-8 print:mt-5`}>{tier.currency}</p>
      <p className={`${NUMBER} text-[2.5rem] leading-none print:text-[2rem]`}>{tier.price.toLocaleString('en-US')}</p>
      <div className="mt-7 flex-1 border-t border-[color:var(--pd-line)] pt-5 print:mt-5 print:pt-4">
        {lead && <p className={`${CAPTION} mb-3`}>{lead}</p>}
        <ul className="space-y-3 print:space-y-2">
          {tier.features.filter((f) => f.trim()).map((feature, i) => (
            <li key={`${i}-${feature}`} className="flex gap-3 text-[14px] leading-snug print:text-[12.5px] text-[color:var(--pd-label)]">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 bg-[color:var(--pd-hint)]" />
              {fillTokens(feature, doc)}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

const COUNT_WORDS: Record<number, string> = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six' };

const COLS: Record<number, string> = {
  1: 'md:grid-cols-1', 2: 'md:grid-cols-2 print:grid-cols-2', 3: 'md:grid-cols-3 print:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4', 5: 'md:grid-cols-3 print:grid-cols-3',
};

/** Standard packages side by side on the scoreboard grid; the featured one as a band beneath. */
export function TournamentPackages({ doc, number }: { doc: TournamentProposal; number: string }) {
  if (doc.tiers.length === 0) return null;
  const standard = doc.tiers.map((t, i) => ({ t, i })).filter(({ t }) => !t.featured);
  const featured = doc.tiers.map((t, i) => ({ t, i })).filter(({ t }) => t.featured);
  return (
    <DocSection
      number={number}
      anchor="tiers"
      eyebrow="Packages"
      title={`${COUNT_WORDS[doc.tiers.length] ?? doc.tiers.length} ${doc.tiers.length === 1 ? 'way' : 'ways'} to be part of it.`}
      standfirst={`Each package covers ${doc.event.name || 'the tournament'} and lists exactly what you receive.`}
    >
      {standard.length > 0 && (
        <div className={`${GRID} grid-cols-1 ${COLS[standard.length] ?? 'md:grid-cols-3 print:grid-cols-3'}`}>
          {standard.map(({ i }) => <TierColumn key={i} doc={doc} index={i} />)}
        </div>
      )}
      <div className="mt-6 space-y-6 print:mt-4">
        {featured.map(({ t, i }) => (
          <TierBand
            key={i}
            caption={t.availability}
            name={t.name}
            summary={t.tagline}
            price={{ currency: t.currency, amount: t.price }}
            leadIn={leadIn(doc.tiers, i)}
            points={t.features.map((f) => fillTokens(f, doc))}
          />
        ))}
      </div>
    </DocSection>
  );
}
