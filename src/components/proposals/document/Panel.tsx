import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  icon?: ReactNode;
  /** Lit panel: brighter pink border and a soft glow, for the one that matters most. */
  lit?: boolean;
  className?: string;
  children: ReactNode;
}

/** Genesis card: cut corners, a thin pink border, a slash tab on the left edge. */
export function Panel({ title, icon, lit = false, className = '', children }: PanelProps) {
  return (
    <div className={`pd-avoid pd-cut-frame p-px ${lit ? 'bg-[color:var(--pd-cue)] pd-lift' : 'bg-[color:var(--pd-line)]'} ${className}`}>
      <div className={`pd-cut-frame relative h-full p-6 md:p-7 print:p-5 ${lit ? 'bg-[color:var(--pd-panel-lit)]' : 'bg-[color:var(--pd-panel)]'}`}>
        <span aria-hidden className="absolute left-0 top-6 h-10 w-1 bg-[color:var(--pd-cue)]" />
        {(title || icon) && (
          <div className="mb-3 flex items-center gap-3">
            {icon && <span className="text-[color:var(--pd-cue)]">{icon}</span>}
            {title && <h3 className="text-xl font-bold uppercase tracking-[0.04em] text-[color:var(--pd-cue)]">{title}</h3>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
