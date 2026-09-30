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
      <CoverSection doc={doc} headline={doc.coverHeadline.trim() || 'Platform partner'} facts={['Platform partnership', 'Esportra']} />
      <AboutSection doc={doc} number="02" title="Where competitive gaming [lives.]" />
      <PlatformAudiences doc={doc} number="03" />
      <PlatformTiers doc={doc} number="04" />
      <PlacementsSection doc={doc} number="05" />
      <ClosingSection doc={doc} number="06" />
    </>
  );
}
