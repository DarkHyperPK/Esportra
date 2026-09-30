import type { TournamentProposal } from '@/schemas/proposal';
import { formatLongDate } from '@/services/proposals/format';
import { AboutSection } from './AboutSection';
import { ContactBlock } from './ContactBlock';
import { CoverSection } from './CoverSection';
import { DocSection } from './DocSection';
import { EventSection } from './EventSection';
import { PartnersBlock } from './PartnersBlock';
import { PlacementMatrix } from './PlacementMatrix';
import { StepsList } from './StepsList';
import { TermsList } from './TermsList';
import { TournamentPackages } from './TournamentPackages';

export function TournamentProposalDocument({ doc }: { doc: TournamentProposal }) {
  return (
    <>
      <CoverSection
        doc={doc}
        kicker="Tournament partner proposal"
        headline={doc.event.name || 'Tournament partner proposal'}
        facts={[
          { label: 'Game', value: doc.event.game },
          { label: 'Starts', value: formatLongDate(doc.event.startDate) },
          { label: 'Streams', value: doc.event.channels },
        ]}
      />
      <AboutSection doc={doc} eyebrow="Esportra" title="A stage that takes every team seriously." />
      <EventSection doc={doc} />
      <TournamentPackages doc={doc} />
      <DocSection number="04" eyebrow="Placements and process" title="Where you appear, and how it runs.">
        <PlacementMatrix doc={doc} />
        <div className="mt-14">
          <StepsList steps={doc.steps} />
        </div>
      </DocSection>
      <DocSection number="05" eyebrow="Partners and contact">
        <div className="space-y-14">
          <PartnersBlock partners={doc.partners} />
          <TermsList terms={doc.terms} />
          <ContactBlock sender={doc.sender} />
        </div>
      </DocSection>
    </>
  );
}
