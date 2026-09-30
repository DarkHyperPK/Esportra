import type { TournamentProposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { Staircase } from './Staircase';
import { TermsList } from './TermsList';

/** Loadouts: the packages as a rising staircase, the exclusive one on top. */
export function TournamentPackages({ doc, number }: { doc: TournamentProposal; number: string }) {
  if (doc.tiers.length === 0) return null;
  const steps = doc.tiers.map((tier, i) => {
    const previous = doc.tiers[i - 1];
    return {
      key: `${tier.name}-${i}`,
      caption: tier.availability,
      name: tier.name,
      price: { currency: tier.currency, amount: tier.price },
      lead: tier.includesPrevious && previous ? `All of ${previous.name}, plus` : undefined,
      points: tier.features.map((f) => fillTokens(f, doc)),
      top: tier.featured,
    };
  });
  return (
    <DocSection doc={doc} number={number} anchor="tiers" segment="Loadouts" title="Pick your [loadout].">
      <Staircase steps={steps} />
      <div className="mt-8">
        <TermsList terms={doc.terms} />
      </div>
    </DocSection>
  );
}
