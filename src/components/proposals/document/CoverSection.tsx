import type { Proposal } from '@/schemas/proposal';
import { fillTokens, formatLongDate } from '@/services/proposals/format';
import { CAPTION, CELL, FLEX_GRID, NUMBER, TITLE } from './docStyles';
import { Lockup } from './Lockup';

export interface CoverTile {
  label: string;
  value: string;
  /** Numbers get hero weight; words stay titles. */
  numeric?: boolean;
}

interface CoverSectionProps {
  doc: Proposal;
  kicker: string;
  tiles: CoverTile[];
}

/** Pre-show: the match card. Partnership lockup as the hero, one sentence, the facts on a scoreboard. */
export function CoverSection({ doc, kicker, tiles }: CoverSectionProps) {
  const photo = doc.images.cover.trim();
  const shown = tiles.filter((t) => t.value.trim());
  return (
    <section data-doc-section="cover" className="pd-section pd-cover relative flex min-h-[92vh] flex-col overflow-hidden px-6 py-10 sm:px-12 md:px-16 md:py-14">
      {photo && (
        <>
          <img src={photo} alt="" className="absolute inset-0 z-[-2] h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 z-[-1] bg-gradient-to-t from-[color:var(--pd-bg)] via-[color:var(--pd-bg)]/75 to-[color:var(--pd-bg)]/40" />
        </>
      )}
      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between border-b border-[color:var(--pd-strong-line)] pb-4">
        <span className={`${CAPTION} flex items-center gap-2 text-[color:var(--pd-label)]`}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--pd-label)]" />
          Pre-show · {kicker}
        </span>
        <span className={CAPTION}>{formatLongDate(doc.preparedOn)}</span>
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-16 print:py-12">
        <p className={`${CAPTION} mb-8`}>Partnership proposal</p>
        <Lockup doc={doc} />
        {doc.coverLine && (
          <p className="mt-12 max-w-md text-pretty text-lg leading-relaxed text-[color:var(--pd-label)] print:mt-10">
            {fillTokens(doc.coverLine, doc)}
          </p>
        )}
      </div>

      {shown.length > 0 && (
        <div className={`${FLEX_GRID} relative mx-auto w-full max-w-5xl`}>
          {shown.map((tile) => (
            <div key={tile.label} className={`${CELL} min-w-[140px] flex-1 p-4 md:p-5`}>
              <p className={CAPTION}>{tile.label}</p>
              <p className={tile.numeric ? `${NUMBER} mt-2 text-4xl leading-none` : `${TITLE} mt-2 text-base md:text-lg`}>{tile.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
