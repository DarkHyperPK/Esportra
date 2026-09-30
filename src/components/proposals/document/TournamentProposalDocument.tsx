import type { TournamentProposal } from '@/schemas/proposal';
import { daysUntil, formatLongDate } from '@/services/proposals/format';
import { AboutSection } from './AboutSection';
import { ClosingSection } from './ClosingSection';
import { CoverSection } from './CoverSection';
import { EventSection } from './EventSection';
import { PlacementsSection } from './PlacementsSection';
import { TournamentPackages } from './TournamentPackages';

export const TOURNAMENT_PAGES = 6;

export function TournamentProposalDocument({ doc }: { doc: TournamentProposal }) {
  const days = daysUntil(doc.preparedOn, doc.event.startDate);
  return (
    <>
      <CoverSection
        doc={doc}
        kicker={doc.event.name}
        tiles={[
          { label: 'Game', value: doc.event.game },
          { label: 'Starts', value: formatLongDate(doc.event.startDate) },
          { label: 'Days to go', value: days === undefined ? '' : String(days), numeric: true },
          { label: 'Streams', value: doc.event.channels },
        ]}
      />
      <AboutSection doc={doc} number="02" title="Where competitive gaming [lives]." />
      <EventSection doc={doc} number="03" />
      <TournamentPackages doc={doc} number="04" />
      <PlacementsSection doc={doc} number="05" />
      <ClosingSection doc={doc} number="06" />
    </>
  );
}
