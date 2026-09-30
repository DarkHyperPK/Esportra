import type { TournamentProposal } from '@/schemas/proposal';
import { fillTokens, formatLongDate, joinFacts } from '@/services/proposals/format';
import { ContactPage } from './ContactPage';
import { CoverPage } from './CoverPage';
import { OverviewPage } from './OverviewPage';
import { PackagesPage } from './PackagesPage';
import { PlacementsPage } from './PlacementsPage';
import { RecordPage } from './RecordPage';

export const TOURNAMENT_PAGES = 6;

/** "Esportra Genesis Stage 2" → "Esportra Genesis [Stage 2]", for proposals saved before the cover title existed. */
function titleFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return name.trim();
  return `${words.slice(0, -2).join(' ')} [${words.slice(-2).join(' ')}]`;
}

export function TournamentProposalDocument({ doc }: { doc: TournamentProposal }) {
  const { event } = doc;
  const tiers = doc.tiers.map((tier, i) => {
    const previous = doc.tiers[i - 1];
    return {
      key: `${tier.name}-${i}`,
      name: tier.name,
      price: `${tier.currency} ${tier.price.toLocaleString('en-US')}`,
      lead: tier.includesPrevious && previous ? `Everything in ${previous.name}, plus` : undefined,
      points: tier.features.map((f) => fillTokens(f, doc)),
      featured: tier.featured,
    };
  });
  return (
    <>
      <CoverPage
        doc={doc}
        title={doc.coverHeadline.trim() || titleFromName(event.name) || 'Tournament [partner]'}
        facts={[event.game, formatLongDate(event.startDate), event.channels]}
      />
      <OverviewPage
        doc={doc}
        number="02"
        panels={[
          { title: 'About Esportra', body: doc.about },
          {
            title: `About ${event.name || 'the event'}`,
            body: (
              <>
                <p>{fillTokens(doc.audienceBody, doc)}</p>
                <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.18em] text-[color:var(--pd-cue)]">
                  {joinFacts([event.game, formatLongDate(event.startDate), event.format, event.prizePool])}
                </p>
                {event.next && <p className="mt-3 text-[14px]">{event.next}</p>}
              </>
            ),
          },
        ]}
      />
      <RecordPage doc={doc} number="03" />
      <PackagesPage doc={doc} number="04" title="Sponsorship [packages]" tiers={tiers} />
      <PlacementsPage doc={doc} number="05" />
      <ContactPage doc={doc} number="06" />
    </>
  );
}
