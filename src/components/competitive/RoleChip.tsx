import { cn } from '@/lib/utils';

interface RoleChipProps {
  role: string;
  displayName: string;
  /** toggle = interactive; display = read-only */
  mode?: 'toggle' | 'display';
  active?: boolean;
  isMain?: boolean;
  onClick?: () => void;
}

/**
 * RoleChip — competitive role identifier.
 * Square corners (brand invariant). No rose coloring.
 * Main role: bg-white text-black. Selected: bg-white text-black. Default: surface-1 border.
 */
export function RoleChip({ role, displayName, mode = 'display', active = false, isMain = false, onClick }: RoleChipProps) {
  const selected = active || isMain;

  const baseClass =
    'inline-flex h-6 items-center px-2 font-rajdhani text-[11px] font-semibold uppercase tracking-wide border transition-colors rounded-none select-none';

  const colorClass = selected
    ? 'bg-white text-[#0A0A0A] border-white'
    : 'bg-white/[0.04] text-white/80 border-white/[0.08] hover:bg-white/[0.07]';

  if (mode === 'toggle') {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={active}
        aria-label={`${displayName} role, ${active ? 'selected' : 'unselected'}`}
        onClick={onClick}
        className={cn(baseClass, colorClass, 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40')}
        data-role={role}
      >
        {displayName}
      </button>
    );
  }

  return (
    <span
      aria-label={`${displayName} role`}
      className={cn(baseClass, colorClass, 'cursor-default')}
      data-role={role}
    >
      {displayName}
    </span>
  );
}
