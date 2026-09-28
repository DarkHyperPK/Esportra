/**
 * TournamentNavItem.tsx
 *
 * Reusable nav item button for the tournament dashboard rail.
 * Supports icon, label, active state, right element (chevron/badge/external icon).
 */

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentNavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  rightElement?: React.ReactNode;
  external?: boolean;
}

export function TournamentNavItem({
  icon: Icon,
  label,
  active,
  onClick,
  disabled = false,
  rightElement,
}: TournamentNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative z-20 flex h-8 w-full items-center gap-2.5 border px-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70',
        active
          ? 'border-transparent bg-rose-500 text-white'
          : 'border-white/15 bg-black text-zinc-200 hover:border-white/25 hover:bg-white/[0.06] hover:text-white',
        disabled && 'pointer-events-none opacity-50'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-zinc-400')} />
      <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wide">
        {label}
      </span>
      {rightElement ? (
        rightElement
      ) : (
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 transition-opacity',
            active ? 'text-white opacity-100' : 'text-zinc-500 opacity-0'
          )}
        />
      )}
    </button>
  );
}
