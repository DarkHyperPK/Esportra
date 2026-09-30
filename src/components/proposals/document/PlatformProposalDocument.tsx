import type { PlatformProposal } from '@/schemas/proposal';
import { AboutSection } from './AboutSection';
import { ClosingSection } from './ClosingSection';
import { CoverSection } from './CoverSection';
import { PlacementsSection } from './PlacementsSection';
import { PlatformAudiences, PlatformTiers } from './PlatformSections';

export const PLATFORM_PAGES = 6;

export function PlatformProposalDocument({ doc }: { doc: PlatformProposal }) {
  return (
    <>
      <CoverSection
        doc={doc}
        headline={doc.coverHeadline.trim() || 'Partner with the platform.'}
        line={doc.coverLine}
        facts={doc.stats.slice(0, 3).map((s) => ({ label: s.label, value: s.value }))}
      />
      <AboutSection doc={doc} number="02" eyebrow="Esportra" title="Where competitive play gets organised." />
      <PlatformAudiences doc={doc} number="03" />
      <PlatformTiers doc={doc} number="04" />
      <PlacementsSection doc={doc} number="05" />
      <ClosingSection doc={doc} number="06" />
    </>
  );
}
