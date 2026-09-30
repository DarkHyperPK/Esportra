import type { Proposal } from '@/schemas/proposal';
import { brandLabel } from '@/services/proposals/format';
import { BrandMark } from './BrandMark';

/**
 * The versus lockup, recast as a partnership: our panel on the dark stage,
 * the partner's name on a white panel offset beneath it, joined by the cue.
 */
export function Lockup({ doc, size = 'lg' }: { doc: Proposal; size?: 'lg' | 'md' }) {
  const big = size === 'lg';
  const name = big ? 'text-[3.2rem] sm:text-7xl md:text-[5.5rem] print:text-[4.4rem]' : 'text-4xl md:text-5xl';
  return (
    <div className="relative">
      <div className="pd-drop inline-block">
      <div className={`pd-cut inline-flex items-center border border-[color:var(--pd-strong-line)] bg-[color:var(--pd-panel)] ${big ? 'px-8 py-7 md:px-10 md:py-9' : 'px-6 py-5'}`}>
        <BrandMark className={big ? 'h-10 md:h-14 print:h-12' : 'h-8'} />
      </div>
      </div>
      <div className={`flex items-center ${big ? 'my-4 pl-[18%]' : 'my-2 pl-[12%]'}`}>
        <span aria-hidden className={`font-heading font-light leading-none text-[color:var(--pd-cue)] ${big ? 'text-6xl' : 'text-4xl'}`}>×</span>
      </div>
      <div className={`pd-drop ${big ? 'ml-[12%]' : 'ml-[8%]'}`}>
      <div className={`pd-cut-r inline-block bg-[color:var(--pd-ink)] ${big ? 'px-8 py-6 md:px-10 md:py-7' : 'px-6 py-4'}`}>
        <span className={`block max-w-[12ch] break-words font-heading font-extrabold leading-[0.95] tracking-[-0.04em] text-[color:var(--pd-bg)] ${name}`}>
          {brandLabel(doc)}
        </span>
      </div>
      </div>
    </div>
  );
}
