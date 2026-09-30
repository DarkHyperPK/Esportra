import type { ReactNode } from 'react';

/** Crosshair-style registration corners and a label tab: a screen on the production desk. */
export function Monitor({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const corner = 'absolute h-4 w-4 border-[color:var(--pd-ink)]';
  return (
    <figure className={`pd-drop relative ${className}`}>
      <span aria-hidden className={`${corner} -left-2 -top-2 border-l-2 border-t-2`} />
      <span aria-hidden className={`${corner} -right-2 -top-2 border-r-2 border-t-2`} />
      <span aria-hidden className={`${corner} -bottom-2 -left-2 border-b-2 border-l-2`} />
      <span aria-hidden className={`${corner} -bottom-2 -right-2 border-b-2 border-r-2`} />
      <div className="overflow-hidden border border-[color:var(--pd-strong-line)] bg-[color:var(--pd-screen)]">{children}</div>
      <figcaption className="absolute -top-2 left-6 -translate-y-full bg-[color:var(--pd-ink)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[color:var(--pd-bg)]">
        {label}
      </figcaption>
    </figure>
  );
}
