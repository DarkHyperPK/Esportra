import type { Proposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { CAPTION } from './docStyles';
import { PartnersBlock } from './PartnersBlock';

/** Post-match: one line, two sentences, a signed lower-third, who is already on board. */
export function ClosingSection({ doc, number }: { doc: Proposal; number: string }) {
  const { sender } = doc;
  const lines = [sender.email, sender.phone, sender.website].filter((l) => l.trim());
  return (
    <DocSection doc={doc} number={number} anchor="close" segment="Post-match" title={doc.closingLine || undefined} intro={fillTokens(doc.closingNote, doc) || undefined}>
      <div>
        <div className="pd-avoid">
          <p className={CAPTION}>Signed</p>
          <div className="mt-4 border-l-2 border-[color:var(--pd-ink)] pl-5">
            <p className="font-heading text-2xl font-extrabold tracking-tight text-[color:var(--pd-ink)]">{sender.name}</p>
            <p className={`${CAPTION} mt-1`}>{[sender.title, sender.company].filter(Boolean).join(' · ')}</p>
            <div className="mt-4 space-y-1 text-[14px] text-[color:var(--pd-label)]">
              {lines.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto border-t border-[color:var(--pd-line)] pt-10">
        <PartnersBlock partners={doc.partners} />
      </div>
    </DocSection>
  );
}
