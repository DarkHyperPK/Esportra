import type { ReactNode } from 'react';
import type { Proposal } from '@/schemas/proposal';
import { useDocMeta } from './docContext';
import { Headline } from './Headline';
import { Hud } from './Hud';

interface DocSectionProps {
  doc: Proposal;
  number: string;
  /** The segment of the "match night" this page is. */
  segment: string;
  title?: string;
  intro?: string;
  anchor: string;
  children?: ReactNode;
}

/** One page: broadcast strip, a short headline, one sentence at most, then the page's one idea. */
export function DocSection({ doc, number, segment, title, intro, anchor, children }: DocSectionProps) {
  const { total } = useDocMeta();
  return (
    <section data-doc-section={anchor} className="pd-section pd-glow flex flex-col px-6 py-10 sm:px-12 md:px-16 md:py-14">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <Hud doc={doc} segment={segment} number={number} total={total} />
        <div className="flex flex-1 flex-col pt-14 md:pt-20 print:pt-12">
          {title && <Headline text={title} doc={doc} className="max-w-3xl text-[2.5rem] md:text-[3.75rem] print:text-[3rem]" />}
          {intro && <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-[color:var(--pd-muted)]">{intro}</p>}
          {children && <div className="mt-12 flex flex-1 flex-col print:mt-10">{children}</div>}
        </div>
      </div>
    </section>
  );
}
