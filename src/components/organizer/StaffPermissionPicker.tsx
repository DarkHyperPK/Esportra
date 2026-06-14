import type { StaffPermission } from '@/types/staff';
import { STAFF_PERMISSION_OPTIONS } from '@/types/staff';

export interface StaffPermissionPickerProps {
  value: StaffPermission[];
  onChange: (permissions: StaffPermission[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function StaffPermissionPicker({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  className,
}: StaffPermissionPickerProps) {
  const isLocked = disabled || readOnly;

  const toggle = (perm: StaffPermission) => {
    if (isLocked) return;
    onChange(
      value.includes(perm)
        ? value.filter((p) => p !== perm)
        : [...value, perm],
    );
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {STAFF_PERMISSION_OPTIONS.map((perm) => {
        const active = value.includes(perm.id);
        return (
          <button
            key={perm.id}
            type="button"
            disabled={isLocked}
            onClick={() => toggle(perm.id)}
            title={perm.description}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              active
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {perm.label}
          </button>
        );
      })}
    </div>
  );
}

export function StaffPermissionChips({
  permissions,
  className,
}: {
  permissions: StaffPermission[];
  className?: string;
}) {
  if (permissions.length === 0) {
    return (
      <span className={`text-[10px] text-zinc-600 italic ${className ?? ''}`}>
        No permissions
      </span>
    );
  }

  const labelById = Object.fromEntries(
    STAFF_PERMISSION_OPTIONS.map((p) => [p.id, p.shortLabel]),
  ) as Record<StaffPermission, string>;

  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ''}`}>
      {permissions.map((perm) => (
        <span
          key={perm}
          className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-[10px] text-zinc-400"
        >
          {labelById[perm] ?? perm}
        </span>
      ))}
    </div>
  );
}
