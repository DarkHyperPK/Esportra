import type { Proposal } from '@/schemas/proposal';
import { brandLabel, formatLongDate, joinFacts } from '@/services/proposals/format';
import { BrandMark } from './BrandMark';
import { CAPTION, CELL, DISPLAY, GRID, TITLE } from './docStyles';

export interface CoverFact {
  label: string;
  value: string;
}

interface CoverSectionProps {
  doc: Proposal;
  kicker: string;
  headline: string;
  facts: CoverFact[];
}

/** Cover: one hero (the headline), a lower-third naming the prospect, three facts on the scoreboard grid. */
export function CoverSection({ doc, kicker, headline, facts }: CoverSectionProps) {
  const shown = facts.filter((f) => f.value.trim());
  const detail = joinFacts([doc.prospect.industry, doc.prospect.attention && `Attn: ${doc.prospect.attention}`]);
  return (
    <section className="pd-section pd-cover flex min-h-[88vh] flex-col justify-between px-5 py-10 sm:px-10 md:px-16 md:py-14">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <BrandMark />
        <span className={CAPTION}>{formatLongDate(doc.preparedOn)}</span>
      </div>

      <div className="mx-auto w-full max-w-5xl py-16 md:py-24">
        <p className={`${CAPTION} mb-6 flex items-center gap-3`}>
          <span aria-hidden className="h-0.5 w-6 bg-[color:var(--pd-cue)]" />
          {kicker}
        </p>
        <h1 className={`${DISPLAY} max-w-4xl text-5xl leading-[0.98] sm:text-6xl md:text-7xl`}>{headline}</h1>

        <div className="mt-14 border-l-2 border-[color:var(--pd-strong-line)] pl-5">
          <p className={CAPTION}>Prepared for</p>
          <p className={`${TITLE} mt-2 text-3xl md:text-4xl`}>{brandLabel(doc)}</p>
          {detail && <p className={`${CAPTION} mt-3`}>{detail}</p>}
        </div>
      </div>

      {shown.length > 0 && (
        <div className={`${GRID} mx-auto w-full max-w-5xl`} style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
          {shown.map((fact) => (
            <div key={fact.label} className={`${CELL} p-4 md:p-6`}>
              <p className={CAPTION}>{fact.label}</p>
              <p className={`${TITLE} mt-2 text-base md:text-xl`}>{fact.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
