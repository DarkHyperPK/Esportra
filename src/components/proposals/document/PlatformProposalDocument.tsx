import type { PlatformProposal } from '@/schemas/proposal';
import { AboutSection } from './AboutSection';
import { ContactBlock } from './ContactBlock';
import { CoverSection } from './CoverSection';
import { DocSection } from './DocSection';
import { CAPTION } from './docStyles';
import { PartnersBlock } from './PartnersBlock';
import { PlatformAudiences, PlatformTiers } from './PlatformSections';
import { StepsList } from './StepsList';
import { TermsList } from './TermsList';

export function PlatformProposalDocument({ doc }: { doc: PlatformProposal }) {
  const portal = doc.portalPoints.filter((p) => p.trim());
  return (
    <>
      <CoverSection
        doc={doc}
        kicker="Platform partner proposal"
        headline="Partner with the platform."
        facts={doc.stats.slice(0, 3).map((s) => ({ label: s.label, value: s.value }))}
      />
      <AboutSection doc={doc} eyebrow="Esportra" title="Where competitive play gets organised." />
      <PlatformAudiences doc={doc} />
      <PlatformTiers doc={doc} />
      <DocSection number="04" eyebrow="Portal and process" title="See what your brand is doing.">
        {portal.length > 0 && (
          <ul className="pd-avoid mb-14 grid gap-x-12 border-t border-[color:var(--pd-line)] md:grid-cols-2">
            {portal.map((point, i) => (
              <li key={`${i}-${point}`} className="border-b border-[color:var(--pd-line)] py-4 text-[15px] text-[color:var(--pd-label)]">
                {point}
              </li>
            ))}
          </ul>
        )}
        <p className={`${CAPTION} mb-6`}>How it works</p>
        <StepsList steps={doc.steps} />
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
