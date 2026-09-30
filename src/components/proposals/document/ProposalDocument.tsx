import type { Proposal } from '@/schemas/proposal';
import { brandLabel, joinFacts, kindLabel } from '@/services/proposals/format';
import '../proposal-theme.css';
import { DocMetaContext } from './docContext';
import { PLATFORM_PAGES, PlatformProposalDocument } from './PlatformProposalDocument';
import { TOURNAMENT_PAGES, TournamentProposalDocument } from './TournamentProposalDocument';

/** Renders either proposal kind on the chosen ground. Pure: all content comes from `doc`. */
export function ProposalDocument({ doc }: { doc: Proposal }) {
  const meta = {
    footer: joinFacts(['Esportra', kindLabel(doc.kind), `Prepared for ${brandLabel(doc)}`]),
    total: doc.kind === 'tournament' ? TOURNAMENT_PAGES : PLATFORM_PAGES,
  };
  return (
    <DocMetaContext.Provider value={meta}>
      <article className="proposal-doc font-body" data-theme={doc.theme} aria-label={doc.title}>
        {doc.kind === 'tournament' ? (
          <TournamentProposalDocument doc={doc} />
        ) : (
          <PlatformProposalDocument doc={doc} />
        )}
      </article>
    </DocMetaContext.Provider>
  );
}
