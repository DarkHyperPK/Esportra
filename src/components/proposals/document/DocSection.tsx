import type { ReactNode } from 'react';
import { CAPTION, DISPLAY } from './docStyles';
import { useDocMeta } from './docContext';

interface DocSectionProps {
  /** Page number within the document ("02"). */
  number: string;
  eyebrow: string;
  title?: string;
  /** One sentence under the title. */
  standfirst?: string;
  /** Anchor the editor uses to scroll the preview. */
  anchor: string;
  children: ReactNode;
}

/**
 * One page: the rose cue beside the page's caption, a display title, the body,
 * and a running footer so a printed page still says whose proposal it is.
 */
export function DocSection({ number, eyebrow, title, standfirst, anchor, children }: DocSectionProps) {
  const meta = useDocMeta();
  return (
    <section
      data-doc-section={anchor}
      className="pd-section flex flex-col border-t border-[color:var(--pd-line)] px-5 pb-8 pt-14 sm:px-10 md:px-16 md:pt-20"
    >
      <div className="mx-auto w-full max-w-5xl flex-1">
        <header className="mb-8 flex items-center gap-3 md:mb-10 print:mb-5">
          <span aria-hidden className="h-0.5 w-6 bg-[color:var(--pd-cue)]" />
          <span className={CAPTION}>{eyebrow}</span>
        </header>
        {title && (
          <h2 className={`${DISPLAY} max-w-3xl text-balance text-[2.25rem] leading-[1.02] md:text-[3.5rem] print:text-[2.6rem]`}>{title}</h2>
        )}
        {standfirst && (
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-[color:var(--pd-muted)] md:text-xl print:mt-3 print:text-base">{standfirst}</p>
        )}
        <div className={title || standfirst ? 'mt-10 md:mt-14 print:mt-8' : ''}>{children}</div>
      </div>
      <footer className="mx-auto mt-14 print:mt-6 flex w-full max-w-5xl items-center justify-between gap-4 border-t border-[color:var(--pd-line)] pt-4">
        <span className={`${CAPTION} truncate`}>{meta.footer}</span>
        <span className={`${CAPTION} shrink-0 tabular-nums`}>
          {number}
          {meta.total > 0 && <span className="text-[color:var(--pd-line)]"> / </span>}
          {meta.total > 0 && String(meta.total).padStart(2, '0')}
        </span>
      </footer>
    </section>
  );
}
