import type { TournamentProposal } from '@/schemas/proposal';
import { formatLongDate } from '@/services/proposals/format';
import { AboutSection } from './AboutSection';
import { ClosingSection } from './ClosingSection';
import { CoverSection } from './CoverSection';
import { EventSection } from './EventSection';
import { PlacementsSection } from './PlacementsSection';
import { TournamentPackages } from './TournamentPackages';

export const TOURNAMENT_PAGES = 6;

export function TournamentProposalDocument({ doc }: { doc: TournamentProposal }) {
  return (
    <>
      <CoverSection
        doc={doc}
        headline={doc.coverHeadline.trim() || doc.event.name || 'Tournament partner proposal'}
        line={doc.coverLine}
        facts={[
          { label: 'Game', value: doc.event.game },
          { label: 'Starts', value: formatLongDate(doc.event.startDate) },
          { label: 'Streams', value: doc.event.channels },
        ]}
      />
      <AboutSection doc={doc} number="02" eyebrow="Esportra" title="A stage that takes every team seriously." />
      <EventSection doc={doc} number="03" />
      <TournamentPackages doc={doc} number="04" />
      <PlacementsSection doc={doc} number="05" />
      <ClosingSection doc={doc} number="06" />
    </>
  );
}
