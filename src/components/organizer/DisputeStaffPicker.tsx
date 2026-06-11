import React from 'react';
import { CheckCircle, Pin } from 'lucide-react';
import type { DisputeStaffMember } from './DisputeActions';

interface DisputeStaffPickerProps {
  assigneeId: string | null;
  staffMembers: DisputeStaffMember[];
  canAssignOthers: boolean;
  isClosed?: boolean;
  compact?: boolean;
  onAssigneeChange: (id: string) => void;
}

const DisputeStaffPicker: React.FC<DisputeStaffPickerProps> = ({
  assigneeId,
  staffMembers,
  canAssignOthers,
  isClosed = false,
  compact = false,
  onAssigneeChange,
}) => {
  const sorted = [...staffMembers].sort((a, b) => {
    if (a.isLeadOrganizer && !b.isLeadOrganizer) return -1;
    if (!a.isLeadOrganizer && b.isLeadOrganizer) return 1;
    return a.label.localeCompare(b.label);
  });

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'} role="listbox" aria-label="Assign reviewer">
      {sorted.map((member) => {
        const selected = assigneeId === member.value;
        const hasDisputePerm = member.isLeadOrganizer || member.permissions.includes('disputes:assist');
        const canSelect = !isClosed && hasDisputePerm && (canAssignOthers || member.value === assigneeId);

        return (
          <button
            key={member.value}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={!canSelect}
            title={
              hasDisputePerm
                ? `Permissions: ${member.permissions.map((p) => p.split(':')[0]).join(', ')}`
                : 'Cannot resolve disputes'
            }
            onClick={() => canSelect && onAssigneeChange(member.value)}
            className={`w-full flex items-center gap-3 rounded-lg border px-3 min-h-[44px] text-left transition-all ${
              selected
                ? 'border-rose-500/30 bg-rose-500/10'
                : 'border-transparent hover:bg-white/[0.04]'
            } ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                selected ? 'bg-rose-500/20 text-rose-300' : 'bg-white/[0.06] text-zinc-400'
              }`}
            >
              {member.label.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white truncate">{member.label}</span>
                {member.isLeadOrganizer && <Pin className="w-3 h-3 text-rose-400 shrink-0" />}
              </div>
              <p className="text-xs text-zinc-500 truncate">{member.role}</p>
            </div>
            {hasDisputePerm && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                title="Can resolve disputes"
              />
            )}
            {selected && <CheckCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          </button>
        );
      })}
      {!canAssignOthers && !isClosed && (
        <p className="text-[11px] text-zinc-600 px-3 pt-1">Only the lead organizer can reassign.</p>
      )}
    </div>
  );
};

export default DisputeStaffPicker;
