import type { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { HINT_CLASS } from './tone';

interface ToggleRowProps {
  id: string;
  title: string;
  description: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Options that only matter when the toggle is on; revealed underneath. */
  children?: ReactNode;
  className?: string;
}

/**
 * An on/off setting. The title says what turns on; the description says what
 * happens to players when it does. Follow-up options appear only when on,
 * so the page stays short for people who don't need them.
 */
export function ToggleRow({ id, title, description, checked, onCheckedChange, disabled, children, className }: ToggleRowProps) {
  return (
    <div className={cn('bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]', className)}>
      <div className="flex items-start justify-between gap-6 p-4">
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-semibold text-white">{title}</label>
          <p className={cn(HINT_CLASS, 'mt-0.5 text-[13px]')}>{description}</p>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="mt-0.5 shrink-0" />
      </div>
      {checked && children && <div className="space-y-5 border-t border-white/[0.06] p-4">{children}</div>}
    </div>
  );
}
