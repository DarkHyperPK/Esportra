import type { Proposal } from '@/schemas/proposal';
import '../proposal-theme.css';
import { PlatformProposalDocument } from './PlatformProposalDocument';
import { TournamentProposalDocument } from './TournamentProposalDocument';

/** Renders either proposal kind on the chosen ground. Pure: all content comes from `doc`. */
export function ProposalDocument({ doc }: { doc: Proposal }) {
  return (
    <article className="proposal-doc font-body" data-theme={doc.theme} aria-label={doc.title}>
      {doc.kind === 'tournament' ? (
        <TournamentProposalDocument doc={doc} />
      ) : (
        <PlatformProposalDocument doc={doc} />
      )}
    </article>
  );
}
