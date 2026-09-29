/**
 * TournamentNavItem.tsx
 *
 * One row in the tournament dashboard rail. Active state is a quiet surface
 * plus a thin rose marker, so the accent points at "you are here" without
 * shouting.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TournamentNavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  rightElement?: React.ReactNode;
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
        'group relative flex h-9 w-full items-center gap-2.5 pl-3 pr-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400/60',
        active ? 'bg-white/[0.06] font-semibold text-white' : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100',
        disabled && 'pointer-events-none opacity-50',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.span
          layoutId="tournament-nav-marker"
          className="absolute inset-y-1 left-0 w-0.5 bg-rose-500"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <Icon
        aria-hidden
        className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-rose-300' : 'text-zinc-500 group-hover:text-zinc-300')}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {rightElement}
    </button>
  );
}
