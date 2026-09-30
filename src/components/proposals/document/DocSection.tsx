import type { ReactNode } from 'react';
import type { Proposal } from '@/schemas/proposal';
import { CAPTION } from './docStyles';
import { useDocMeta } from './docContext';
import { Headline } from './Headline';

interface DocSectionProps {
  doc: Proposal;
  /** Page number within the document ("02"); also drawn large beside the caption. */
  number: string;
  eyebrow: string;
  title?: string;
  intro?: string;
  /** Anchor the editor uses to scroll the preview. */
  anchor: string;
  align?: 'left' | 'center';
  children?: ReactNode;
}

/** One page: big quiet number, caption, headline, at most one short paragraph, then the page's one idea. */
export function DocSection({ doc, number, eyebrow, title, intro, anchor, align = 'left', children }: DocSectionProps) {
  const meta = useDocMeta();
  const centered = align === 'center';
  return (
    <section data-doc-section={anchor} className="pd-section pd-glow flex flex-col px-6 pb-8 pt-16 sm:px-12 md:px-20 md:pt-24">
      <div className={`mx-auto flex w-full max-w-5xl flex-1 flex-col ${centered ? 'items-center justify-center text-center' : ''}`}>
        <header className={`mb-8 flex items-end gap-4 print:mb-6 ${centered ? 'justify-center' : ''}`}>
          <span aria-hidden className="font-heading text-5xl font-extrabold leading-none tracking-tight text-[color:var(--pd-number)] tabular-nums md:text-6xl">
            {number}
          </span>
          <span className={`${CAPTION} pb-1.5`}>{eyebrow}</span>
        </header>
        {title && <Headline text={title} doc={doc} className="max-w-3xl text-[2.6rem] md:text-[4rem] print:text-[3.1rem]" />}
        {intro && (
          <p className={`mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-[color:var(--pd-muted)] md:text-base ${centered ? 'mx-auto' : ''}`}>
            {intro}
          </p>
        )}
        {children && <div className="mt-14 w-full print:mt-10">{children}</div>}
      </div>
      <footer className="mx-auto mt-16 flex w-full max-w-5xl items-center justify-between print:mt-6">
        <span className={CAPTION}>{meta.footer}</span>
        <span className={`${CAPTION} tabular-nums`}>{number} / {String(meta.total).padStart(2, '0')}</span>
      </footer>
    </section>
  );
}
