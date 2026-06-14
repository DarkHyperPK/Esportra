import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, XCircle, UserCheck, Shield, Gavel, AlertTriangle,
} from 'lucide-react';
import type { StaffPermission } from '@/types/staff';

export interface DisputeStaffMember {
  value: string;
  label: string;
  role: string;
  permissions: StaffPermission[];
  isLeadOrganizer?: boolean;
  isAssigned?: boolean;
}

const PERM_LABELS: Record<StaffPermission, string> = {
  'scores:update': 'Scores',
  'teams:manage': 'Teams',
  'bracket:edit': 'Brackets',
  'announcements:send': 'Announce',
  'disputes:assist': 'Disputes',
};

interface DisputeActionsProps {
  status: 'open' | 'resolved' | 'rejected';
  canAssist: boolean;
  canAssignOthers: boolean;
  assigneeId: string | null;
  staffMembers: DisputeStaffMember[];
  assignmentLoading: boolean;
  resolutionNotes: string;
  resolutionStatus: 'resolved' | 'rejected';
  enforceReportScore: boolean;
  canEnforceReportScore: boolean;
  reportedScoreLabel?: string | null;
  resolvedByName?: string | null;
  onAssigneeChange: (id: string) => void;
  onAssign: () => void;
  onStatusChange: (status: 'resolved' | 'rejected') => void;
  onNotesChange: (notes: string) => void;
  onEnforceReportScoreChange: (value: boolean) => void;
  onResolve: () => void;
}

const DisputeActions: React.FC<DisputeActionsProps> = ({
  status, canAssist, canAssignOthers,
  assigneeId, staffMembers, assignmentLoading,
  resolutionNotes, resolutionStatus, enforceReportScore,
  canEnforceReportScore, reportedScoreLabel, resolvedByName,
  onAssigneeChange, onAssign, onStatusChange, onNotesChange,
  onEnforceReportScoreChange, onResolve,
}) => {
  const isClosed = status === 'resolved' || status === 'rejected';

  if (!canAssist) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
        You can view dispute details, but only the organizer or assigned moderators can take action.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Staff assignment */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-zinc-500" />
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Assign reviewer</span>
          </div>
          {!isClosed && assigneeId && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAssign}
              disabled={assignmentLoading || !canAssignOthers}
              className="border-white/[0.06] text-zinc-300 hover:bg-white/[0.04] h-7 text-xs px-2.5"
            >
              {assignmentLoading ? 'Saving…' : 'Save assignment'}
            </Button>
          )}
        </div>

        <div className="grid gap-2 max-h-[200px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {staffMembers.map((member) => {
            const selected = assigneeId === member.value;
            const canSelect = !isClosed && (canAssignOthers || member.value === assigneeId);
            const hasDisputePerm = member.isLeadOrganizer || member.permissions.includes('disputes:assist');

            return (
              <button
                key={member.value}
                type="button"
                disabled={!canSelect}
                onClick={() => canSelect && onAssigneeChange(member.value)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  selected
                    ? 'border-rose-500/40 bg-rose-500/10 ring-1 ring-rose-500/20'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                } ${!canSelect ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{member.label}</span>
                      {member.isAssigned && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300 px-1.5 py-0">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{member.role}</p>
                  </div>
                  {selected && <CheckCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {hasDisputePerm && (
                    <Badge className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/20 px-1.5 py-0">
                      Can resolve
                    </Badge>
                  )}
                  {member.permissions.map((perm) => (
                    <Badge
                      key={perm}
                      variant="outline"
                      className="text-[10px] border-white/[0.08] text-zinc-400 px-1.5 py-0"
                    >
                      {PERM_LABELS[perm] || perm}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        {!canAssignOthers && !isClosed && (
          <p className="text-[11px] text-zinc-600">Only the lead organizer can reassign disputes.</p>
        )}
      </div>

      {/* Resolution */}
      {!isClosed && (
        <div className="space-y-3 pt-1 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-zinc-500" />
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Final decision</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onStatusChange('resolved')}
              className={`rounded-xl border p-3 text-left transition-all ${
                resolutionStatus === 'resolved'
                  ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/25'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className={`w-4 h-4 ${resolutionStatus === 'resolved' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span className={`text-sm font-semibold ${resolutionStatus === 'resolved' ? 'text-emerald-300' : 'text-zinc-300'}`}>
                  Resolve
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Close the dispute and clear the disputed match state.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onStatusChange('rejected')}
              className={`rounded-xl border p-3 text-left transition-all ${
                resolutionStatus === 'rejected'
                  ? 'border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/25'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <XCircle className={`w-4 h-4 ${resolutionStatus === 'rejected' ? 'text-rose-400' : 'text-zinc-500'}`} />
                <span className={`text-sm font-semibold ${resolutionStatus === 'rejected' ? 'text-rose-300' : 'text-zinc-300'}`}>
                  Reject
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Dismiss the claim and release teams to continue play.
              </p>
            </button>
          </div>

          {resolutionStatus === 'resolved' && canEnforceReportScore && (
            <label className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 cursor-pointer hover:border-white/[0.1]">
              <input
                type="checkbox"
                checked={enforceReportScore}
                onChange={(e) => onEnforceReportScoreChange(e.target.checked)}
                className="mt-0.5 accent-emerald-500"
              />
              <div className="min-w-0">
                <p className="text-sm text-white font-medium">Apply reported score to bracket</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {reportedScoreLabel
                    ? `Enforce ${reportedScoreLabel} as the official match result.`
                    : 'Use the disputed report scores as the official result.'}
                </p>
              </div>
            </label>
          )}

          {resolutionStatus === 'rejected' && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200/80">
                Rejecting clears disputed reports. Set the correct score from brackets if needed.
              </p>
            </div>
          )}

          <Textarea
            value={resolutionNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={
              resolutionStatus === 'resolved'
                ? 'Explain your decision for both teams (required)…'
                : 'Why is this dispute being rejected? (required)…'
            }
            className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-zinc-600 min-h-[80px] text-sm rounded-xl"
          />

          <Button
            onClick={onResolve}
            disabled={!resolutionNotes.trim()}
            className={`w-full h-10 text-sm font-semibold ${
              resolutionStatus === 'resolved'
                ? 'bg-emerald-600 text-white border-transparent hover:bg-emerald-600 hover:text-white'
                : 'bg-rose-600 hover:bg-rose-600 text-white'
            }`}
          >
            <Shield className="w-4 h-4 mr-2" />
            {resolutionStatus === 'resolved' ? 'Confirm resolution' : 'Confirm rejection'}
          </Button>
        </div>
      )}

      {isClosed && (
        <div className={`rounded-xl p-3 text-sm border border-white/[0.06] bg-white/[0.02] border-l-[3px] ${
          status === 'resolved'
            ? 'border-l-emerald-500 text-emerald-300'
            : 'border-l-rose-500 text-red-300'
        }`}>
          This dispute has been <strong>{status}</strong>
          {resolvedByName && (
            <span className="text-zinc-400"> by <span className="text-white font-medium">{resolvedByName}</span></span>
          )}
          .
        </div>
      )}
    </div>
  );
};

export default DisputeActions;
