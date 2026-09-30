import { brandLabel } from '@/services/proposals/format';
import type { Proposal } from '@/schemas/proposal';
import { CAPTION } from './docStyles';

interface HudProps {
  doc: Proposal;
  segment: string;
  number: string;
  total: number;
}

/**
 * The broadcast strip at the top of every page: the matchup chip, the
 * segment of the "show" and the page count, like a scorebug over the play.
 */
export function Hud({ doc, segment, number, total }: HudProps) {
  return (
    <div className="flex items-stretch border border-[color:var(--pd-strong-line)] font-mono text-[10px] font-semibold uppercase tracking-[0.24em]">
      <span className="pd-chip hidden shrink-0 items-center gap-2 bg-[color:var(--pd-ink)] py-2 pl-3 pr-6 text-[color:var(--pd-bg)] sm:flex print:flex">
        Esportra <span aria-hidden className="opacity-50">×</span> {brandLabel(doc)}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-3 truncate px-4 py-2 text-[color:var(--pd-label)]">
        <span className="tabular-nums text-[color:var(--pd-hint)]">{number}</span>
        {segment}
      </span>
      <span className={`${CAPTION} flex shrink-0 items-center border-l border-[color:var(--pd-strong-line)] px-3 tabular-nums`}>
        {number}/{String(total).padStart(2, '0')}
      </span>
    </div>
  );
}
