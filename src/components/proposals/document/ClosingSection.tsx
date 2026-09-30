import type { Proposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { PartnersBlock } from './PartnersBlock';

/** A short letter to close: the line, two sentences, the signature, and who is already on board. */
export function ClosingSection({ doc, number }: { doc: Proposal; number: string }) {
  const { sender } = doc;
  const lines = [sender.phone, sender.email, sender.website].filter((l) => l.trim());
  return (
    <DocSection doc={doc} number={number} anchor="close" eyebrow="Closing note" title={doc.closingLine || undefined} intro={fillTokens(doc.closingNote, doc) || undefined} align="center">
      <div className="pd-avoid mx-auto max-w-sm text-[15px] leading-relaxed text-[color:var(--pd-muted)]">
        <p>Warm regards,</p>
        <p className="mt-4 font-heading text-xl font-bold text-[color:var(--pd-ink)]">{sender.name}</p>
        <p>{[sender.title, sender.company].filter(Boolean).join(', ')}</p>
        {lines.map((line) => <p key={line} className="text-[color:var(--pd-label)]">{line}</p>)}
      </div>
      <div className="mt-16 flex justify-center">
        <PartnersBlock partners={doc.partners} />
      </div>
    </DocSection>
  );
}
