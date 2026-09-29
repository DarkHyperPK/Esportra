import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { StatusPill } from '@/components/ui/kit';
import { cn } from '@/lib/utils';

export type RoundState = 'set' | 'unset' | 'unsaved' | 'partial';

const STATE_PILL: Record<RoundState, { label: string; tone: 'success' | 'warning' | 'accent' | 'neutral' }> = {
  set: { label: 'Scheduled', tone: 'success' },
  unset: { label: 'Not set', tone: 'warning' },
  unsaved: { label: 'Unsaved', tone: 'accent' },
  partial: { label: 'Partly set', tone: 'warning' },
};

interface RoundRowProps {
  number: number;
  name: string;
  matchCount: number;
  /** One line that answers "when is this round?" without opening it. */
  when: string | null;
  state: RoundState;
  expanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

/**
 * One round in the schedule. Collapsed, it reads like a fixture list line:
 * number, name, size, when, state. Expanded, the editor opens underneath.
 */
export function RoundRow({ number, name, matchCount, when, state, expanded, onToggle, children }: RoundRowProps) {
  const pill = STATE_PILL[state];
  return (
    <div className={cn('border-b border-white/[0.06] last:border-b-0', expanded && 'bg-white/[0.02]')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 sm:grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1fr)_7.5rem_1rem] sm:px-6"
      >
        <span className="font-heading text-sm font-black tabular-nums text-zinc-500">{String(number).padStart(2, '0')}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">{name}</span>
          <span className="block text-xs text-zinc-500">
            {matchCount} match{matchCount === 1 ? '' : 'es'}
          </span>
        </span>
        <span className={cn('col-start-2 truncate font-mono text-xs tabular-nums sm:col-start-auto sm:text-[13px]', when ? 'text-zinc-200' : 'text-zinc-600')}>
          {when ?? 'No time yet'}
        </span>
        <span className="col-start-3 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto">
          <StatusPill tone={pill.tone} label={pill.label} />
        </span>
        <ChevronDown
          aria-hidden
          className={cn('hidden h-4 w-4 text-zinc-500 transition-transform duration-200 sm:block', expanded && 'rotate-180')}
        />
      </button>
      {expanded && <div className="px-5 pb-5 pt-1 sm:pl-[4.5rem] sm:pr-6">{children}</div>}
    </div>
  );
}
