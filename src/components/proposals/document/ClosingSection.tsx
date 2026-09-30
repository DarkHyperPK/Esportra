import type { Proposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';
import { ContactBlock } from './ContactBlock';
import { DocSection } from './DocSection';
import { PartnersBlock } from './PartnersBlock';
import { StepsList } from './StepsList';
import { TermsList } from './TermsList';
import { CAPTION } from './docStyles';

/** The last page: the promise, how it runs, who to talk to, who is already here, the terms. */
export function ClosingSection({ doc, number }: { doc: Proposal; number: string }) {
  return (
    <DocSection number={number} anchor="close" eyebrow="Next" title={fillTokens(doc.closingLine, doc) || undefined}>
      {doc.steps.length > 0 && (
        <div className="mb-14 print:mb-8">
          <p className={`${CAPTION} mb-6`}>How it runs</p>
          <StepsList steps={doc.steps} />
        </div>
      )}
      <div className="grid gap-12 border-t border-[color:var(--pd-line)] pt-10 md:grid-cols-[1fr_1.1fr] print:grid-cols-[1fr_1.1fr] print:gap-8 print:pt-6">
        <ContactBlock sender={doc.sender} />
        <PartnersBlock partners={doc.partners} />
      </div>
      <div className="mt-12 print:mt-6">
        <TermsList terms={doc.terms} />
      </div>
    </DocSection>
  );
}
