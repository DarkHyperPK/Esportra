import type { ReactNode } from 'react';
import type { ZoneSlot } from '@/services/proposals/placements';

/** Grey stand-in for page content, so the partner's slots read first. */
export function Bar({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`block bg-[color:var(--pd-line)] ${className}`} />;
}

interface SlotProps {
  slot: ZoneSlot | undefined;
  brand: string;
  className?: string;
  /** Small slots set the name in smaller type. */
  size?: 'md' | 'sm' | 'xs';
  /** Repeated slots (card badges) number only the first one. */
  marker?: boolean;
}

const NAME_SIZE = {
  md: 'px-3 text-[11px] tracking-[0.14em] md:text-xs',
  sm: 'px-2 pl-5 text-[8px] tracking-[0.08em]',
  xs: 'hidden',
};

/** A partner placement: white well, numbered to match the legend, set with the prospect's name. */
export function Slot({ slot, brand, className = '', size = 'md', marker = true }: SlotProps) {
  if (!slot) return null;
  return (
    <span className={`pd-slot flex items-center justify-center overflow-hidden ${className}`}>
      {marker && (
        <span className="absolute left-0 top-0 bg-[color:var(--pd-slot-ink)] px-1 font-mono text-[8px] font-bold leading-[14px] text-[color:var(--pd-slot)] tabular-nums">
          {slot.marker}
        </span>
      )}
      <span className={`truncate font-heading font-black uppercase ${NAME_SIZE[size]}`}>{brand}</span>
    </span>
  );
}

export function MockFrame({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <figure className={`pd-avoid ${className}`}>
      <div className="border border-[color:var(--pd-strong-line)] bg-[color:var(--pd-screen)]">{children}</div>
      <figcaption className="mt-3 print:mt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--pd-hint)]">
        {label}
      </figcaption>
    </figure>
  );
}
