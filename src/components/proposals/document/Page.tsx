import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { useDocMeta } from './docContext';
import { Slashes } from './Slashes';

interface PageProps {
  anchor: string;
  /** Page number shown in the footer ("02"). Omit on the cover. */
  number?: string;
  children: ReactNode;
  className?: string;
}

/** Page chrome from the Genesis identity: mark, rule and slashes on top; rule and page number below. */
export function Page({ anchor, number, children, className = '' }: PageProps) {
  const { footer } = useDocMeta();
  return (
    <section data-doc-section={anchor} className={`pd-section pd-page flex min-h-[92vh] flex-col px-7 py-9 sm:px-12 md:px-16 md:py-12 print:min-h-0 print:px-[14mm] print:py-[12mm] ${className}`}>
      <span aria-hidden className="pointer-events-none absolute inset-4 border border-[color:var(--pd-line)] [clip-path:polygon(0_0,calc(100%-40px)_0,100%_40px,100%_100%,40px_100%,0_calc(100%-40px))] md:inset-6" />
      <header className="relative mx-auto flex w-full max-w-5xl items-center gap-5">
        <BrandMark className="h-14 md:h-16 print:h-14" />
        <span aria-hidden className="h-px flex-1 bg-[color:var(--pd-cue)] opacity-70" />
        <Slashes />
      </header>
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col pt-10 print:pt-8">{children}</div>
      {number && (
        <footer className="relative mx-auto mt-10 flex w-full max-w-5xl items-center gap-5 print:mt-6">
          <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[color:var(--pd-hint)]">{footer}</span>
          <span aria-hidden className="h-px flex-1 bg-[color:var(--pd-line)]" />
          <span className="text-sm font-semibold text-[color:var(--pd-label)]">
            Page <span className="text-[color:var(--pd-cue)] tabular-nums">{number}</span>
          </span>
        </footer>
      )}
    </section>
  );
}
