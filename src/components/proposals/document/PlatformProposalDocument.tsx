import type { PlatformProposal } from '@/schemas/proposal';
import { ContactPage } from './ContactPage';
import { CoverPage } from './CoverPage';
import { OverviewPage } from './OverviewPage';
import { PackagesPage } from './PackagesPage';
import { PlacementsPage } from './PlacementsPage';
import { RecordPage } from './RecordPage';

export const PLATFORM_PAGES = 6;

export function PlatformProposalDocument({ doc }: { doc: PlatformProposal }) {
  const audiences = doc.audiences.filter((a) => a.who.trim());
  const tiers = doc.tiers.map((tier, i) => ({
    key: `${tier.name}-${i}`,
    name: tier.name,
    summary: tier.summary,
    points: tier.points,
    featured: tier.featured,
  }));
  return (
    <>
      <CoverPage doc={doc} title={doc.coverHeadline.trim() || 'Platform [partnership]'} facts={['Year-round', 'Pakistan']} />
      <OverviewPage
        doc={doc}
        number="02"
        panels={[
          { title: 'About Esportra', body: doc.about },
          {
            title: 'Who is on the platform',
            body: (
              <>
                <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2">
                  {audiences.map((a) => (
                    <li key={a.who}>
                      <span className="block text-[15px] font-bold uppercase tracking-[0.05em] text-[color:var(--pd-ink)]">{a.who}</span>
                      <span className="text-[14px]">{a.body}</span>
                    </li>
                  ))}
                </ul>
                {doc.outlook && <p className="mt-4 text-[14px]">{doc.outlook}</p>}
              </>
            ),
          },
        ]}
      />
      <RecordPage doc={doc} number="03" />
      <PackagesPage doc={doc} number="04" title="Partnership [levels]" tiers={tiers} note="Quoted by value. Terms are agreed with each partner." />
      <PlacementsPage doc={doc} number="05" />
      <ContactPage doc={doc} number="06" />
    </>
  );
}
