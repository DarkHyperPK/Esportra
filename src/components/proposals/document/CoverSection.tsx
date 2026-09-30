import type { Proposal } from '@/schemas/proposal';
import { brandLabel, fillTokens, formatLongDate, joinFacts, kindLabel } from '@/services/proposals/format';
import { BrandMark } from './BrandMark';
import { CAPTION, CELL, DISPLAY, FLEX_GRID, NUMBER, TITLE } from './docStyles';

export interface CoverFact {
  label: string;
  value: string;
}

interface CoverSectionProps {
  doc: Proposal;
  headline: string;
  line: string;
  facts: CoverFact[];
}

/**
 * Cinematic cover: the brand texture, one line at hero scale, then who it is
 * for and who sent it, and the three facts a reader needs first.
 */
export function CoverSection({ doc, headline, line, facts }: CoverSectionProps) {
  const shown = facts.filter((f) => f.value.trim());
  const detail = joinFacts([doc.prospect.industry, doc.prospect.attention && `Attn ${doc.prospect.attention}`]);
  return (
    <section
      data-doc-section="cover"
      className="pd-section pd-cover flex min-h-[92vh] flex-col px-5 py-8 sm:px-10 md:px-16 md:py-12"
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <BrandMark />
        <span className={`${CAPTION} text-right`}>{joinFacts([kindLabel(doc.kind), formatLongDate(doc.preparedOn)])}</span>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-16">
        <p className={`${CAPTION} mb-7 flex items-center gap-3`}>
          <span aria-hidden className="h-0.5 w-6 bg-[color:var(--pd-cue)]" />
          Partner proposal
        </p>
        <h1 className={`${DISPLAY} max-w-4xl text-balance text-[3.25rem] leading-[0.94] tracking-[-0.03em] sm:text-7xl md:text-[6.5rem]`}>
          {headline}
        </h1>
        {line && (
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--pd-label)] md:text-[1.35rem]">
            {fillTokens(line, doc)}
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 grid gap-8 sm:grid-cols-2">
          <div className="border-l-2 border-[color:var(--pd-strong-line)] pl-5">
            <p className={CAPTION}>Prepared for</p>
            <p className={`${TITLE} mt-2 text-3xl md:text-4xl`}>{brandLabel(doc)}</p>
            {detail && <p className={`${CAPTION} mt-3`}>{detail}</p>}
          </div>
          <div className="border-l-2 border-[color:var(--pd-line)] pl-5 sm:justify-self-end">
            <p className={CAPTION}>Prepared by</p>
            <p className={`${TITLE} mt-2 text-lg`}>{doc.sender.name}</p>
            <p className={`${CAPTION} mt-2`}>{joinFacts([doc.sender.title, doc.sender.company])}</p>
          </div>
        </div>
        {shown.length > 0 && (
          <div className={FLEX_GRID}>
            {shown.map((fact) => (
              <div key={fact.label} className={`${CELL} min-w-[150px] flex-1 p-4 md:p-5`}>
                <p className={CAPTION}>{fact.label}</p>
                <p className={/^\d[\d,.]*$/.test(fact.value.trim()) ? `${NUMBER} mt-2 text-4xl leading-none` : `${TITLE} mt-2 text-base md:text-lg`}>
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
