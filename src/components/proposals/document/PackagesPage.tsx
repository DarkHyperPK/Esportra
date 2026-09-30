import type { Proposal } from '@/schemas/proposal';
import { Page } from './Page';
import { TierCard, type TierCardData } from './TierCard';
import { Title } from './Title';

const COLS: Record<number, string> = {
  1: 'grid-cols-1', 2: 'sm:grid-cols-2 print:grid-cols-2', 3: 'sm:grid-cols-3 print:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4', 5: 'sm:grid-cols-3 print:grid-cols-3',
};

interface PackagesPageProps {
  doc: Proposal;
  number: string;
  title: string;
  tiers: TierCardData[];
  note?: string;
}

/** 03. The ladder, side by side; the featured tier lit in pink. */
export function PackagesPage({ doc, number, title, tiers, note }: PackagesPageProps) {
  const terms = doc.terms.filter((t) => t.trim());
  return (
    <Page anchor="tiers" number={number}>
      <Title doc={doc} number="03." text={title} />
      {note && <p className="mt-5 text-lg font-medium text-[color:var(--pd-muted)]">{note}</p>}
      <div className={`mt-10 grid gap-4 ${COLS[tiers.length] ?? 'sm:grid-cols-3 print:grid-cols-3'} print:mt-8 print:gap-3`}>
        {tiers.map((tier, i) => <TierCard key={tier.key} tier={tier} index={i} />)}
      </div>
      {terms.length > 0 && (
        <ul className="mt-auto space-y-1 pt-8">
          {terms.map((term, i) => (
            <li key={`${i}-${term}`} className="text-[12px] font-medium text-[color:var(--pd-hint)]">{term}</li>
          ))}
        </ul>
      )}
    </Page>
  );
}
