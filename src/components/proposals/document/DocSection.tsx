import type { ReactNode } from 'react';
import { CAPTION, DISPLAY } from './docStyles';

interface DocSectionProps {
  number: string;
  eyebrow: string;
  title?: string;
  children: ReactNode;
}

/** One page of the proposal: numbered caption with the single rose cue, then a display title. */
export function DocSection({ number, eyebrow, title, children }: DocSectionProps) {
  return (
    <section className="pd-section border-t border-[color:var(--pd-line)] px-5 py-14 sm:px-10 md:px-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-3 md:mb-12">
          <span className={`${CAPTION} tabular-nums`}>{number}</span>
          <span aria-hidden className="h-0.5 w-6 bg-[color:var(--pd-cue)]" />
          <span className={CAPTION}>{eyebrow}</span>
        </header>
        {title && (
          <h2 className={`${DISPLAY} mb-10 max-w-3xl text-3xl leading-[1.05] md:mb-14 md:text-5xl`}>{title}</h2>
        )}
        {children}
      </div>
    </section>
  );
}
