import type { Proposal } from '@/schemas/proposal';
import { brandLabel, fillTokens, formatLongDate, joinFacts } from '@/services/proposals/format';
import { BrandMark } from './BrandMark';
import { CAPTION } from './docStyles';
import { Headline } from './Headline';

interface CoverSectionProps {
  doc: Proposal;
  headline: string;
  facts: string[];
}

/**
 * The cover. With a cover photo, the photo fills the page under a dark fade.
 * Without one, the real tournament page is lifted off the right edge.
 */
export function CoverSection({ doc, headline, facts }: CoverSectionProps) {
  const photo = doc.images.cover.trim();
  const product = !photo && doc.images.page.trim();
  return (
    <section data-doc-section="cover" className="pd-section pd-cover relative flex min-h-[92vh] flex-col overflow-hidden px-6 py-10 sm:px-12 md:px-20 md:py-14">
      {photo && (
        <>
          <img src={photo} alt="" className="absolute inset-0 z-[-2] h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 z-[-1] bg-gradient-to-t from-[color:var(--pd-bg)] via-[color:var(--pd-bg)]/70 to-[color:var(--pd-bg)]/30" />
        </>
      )}
      {product && (
        <img
          src={product}
          alt=""
          className="pd-lift absolute -right-24 top-[14%] z-[-2] hidden w-[46%] max-w-[520px] rotate-[4deg] opacity-90 md:block print:-right-28 print:block print:w-[38%]"
        />
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between">
        <BrandMark />
        <span className={CAPTION}>{formatLongDate(doc.preparedOn)}</span>
      </div>

      <div className="mx-auto mt-auto w-full max-w-5xl pt-32">
        <p className={`${CAPTION} mb-6 flex items-center gap-3`}>
          <span aria-hidden className="h-px w-8 bg-[color:var(--pd-strong-line)]" />
          Proposal for {brandLabel(doc)}
        </p>
        <Headline as="h1" text={headline} doc={doc} className="max-w-[11ch] text-[3rem] sm:text-7xl md:text-[5.5rem] print:text-[4.1rem]" />
        {doc.coverLine && (
          <p className="mt-8 max-w-md text-pretty text-base leading-relaxed text-[color:var(--pd-label)] md:text-lg">
            {fillTokens(doc.coverLine, doc)}
          </p>
        )}
        {facts.length > 0 && <p className={`${CAPTION} mt-10`}>{joinFacts(facts)}</p>}
      </div>
    </section>
  );
}
