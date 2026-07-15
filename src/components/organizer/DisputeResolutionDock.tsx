import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, ChevronDown, Shield } from 'lucide-react';
import DisputeStaffPicker from './DisputeStaffPicker';
import type { DisputeStaffMember } from './DisputeActions';

interface DisputeResolutionDockProps {
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
  referenceNumber?: string | null;
  onAssigneeChange: (id: string) => void;
  onStatusChange: (status: 'resolved' | 'rejected') => void;
  onNotesChange: (notes: string) => void;
  onEnforceReportScoreChange: (value: boolean) => void;
  onResolve: () => void;
}

const MIN_NOTES_LENGTH = 10;

const DisputeResolutionDock: React.FC<DisputeResolutionDockProps> = ({
  canAssist,
  canAssignOthers,
  assigneeId,
  staffMembers,
  assignmentLoading,
  resolutionNotes,
  resolutionStatus,
  enforceReportScore,
  canEnforceReportScore,
  reportedScoreLabel,
  referenceNumber,
  onAssigneeChange,
  onStatusChange,
  onNotesChange,
  onEnforceReportScoreChange,
  onResolve,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [notesError, setNotesError] = useState(false);

  if (!canAssist) {
    return (
      <div className="shrink-0 border-t border-white/[0.06] p-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
          You can view dispute details, but only the organizer or assigned moderators can take action.
        </div>
      </div>
    );
  }

  const notesValid = resolutionNotes.trim().length >= MIN_NOTES_LENGTH;
  const assigneeLabel = staffMembers.find((m) => m.value === assigneeId)?.label || 'Unassigned';

  const handleConfirmClick = () => {
    if (!notesValid) {
      setNotesError(true);
      setExpanded(true);
      return;
    }
    setConfirmPending(true);
  };

  const handleFinalConfirm = () => {
    setConfirmPending(false);
    onResolve();
  };

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-[#0a0a0c] shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
      {confirmPending && (
        <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-zinc-300">
            {resolutionStatus === 'resolved' ? 'Resolve' : 'Reject'} dispute{' '}
            <span className="font-mono text-rose-400/80">{referenceNumber || ''}</span>
            {' '}and notify both teams?
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmPending(false)}
              className="border-white/[0.06] text-zinc-300 h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleFinalConfirm}
              disabled={assignmentLoading}
              className={`h-9 ${
                resolutionStatus === 'resolved'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white'
                  : 'bg-rose-600 text-white hover:bg-rose-600 hover:text-white'
              }`}
            >
              Yes, {resolutionStatus === 'resolved' ? 'resolve' : 'reject'}
            </Button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-4 pt-3 space-y-3 border-b border-white/[0.06]">
          <p className="text-[11px] text-zinc-500">
            {resolutionStatus === 'resolved'
              ? 'Clears disputed state on the match room.'
              : 'Teams can continue play; set bracket score manually if needed.'}
          </p>

          {resolutionStatus === 'resolved' && canEnforceReportScore && (
            <label className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 cursor-pointer">
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

          <details className="group">
            <summary className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer list-none py-1">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              Reviewer: <span className="text-white">{assigneeLabel}</span>
            </summary>
            <div className="mt-2 pb-2">
              <DisputeStaffPicker
                assigneeId={assigneeId}
                staffMembers={staffMembers}
                canAssignOthers={canAssignOthers}
                onAssigneeChange={onAssigneeChange}
              />
            </div>
          </details>

          <Textarea
            value={resolutionNotes}
            onChange={(e) => {
              onNotesChange(e.target.value);
              if (e.target.value.trim().length >= MIN_NOTES_LENGTH) setNotesError(false);
            }}
            onFocus={() => setExpanded(true)}
            placeholder="Explain your decision for both teams (required)…"
            aria-invalid={notesError}
            className={`bg-white/[0.03] border-white/[0.06] text-white placeholder:text-zinc-600 min-h-[80px] text-sm rounded-xl ${
              notesError ? 'border-rose-500/50' : ''
            }`}
          />
          {notesError && (
            <p className="text-[11px] text-rose-400">Decision notes must be at least {MIN_NOTES_LENGTH} characters.</p>
          )}
        </div>
      )}

      <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
        <div
          className="flex rounded-lg border border-white/[0.06] p-0.5 bg-white/[0.02]"
          role="radiogroup"
          aria-label="Resolution outcome"
        >
          <button
            type="button"
            role="radio"
            aria-checked={resolutionStatus === 'resolved'}
            onClick={() => onStatusChange('resolved')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition min-h-[44px] ${
              resolutionStatus === 'resolved'
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Resolve
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={resolutionStatus === 'rejected'}
            onClick={() => onStatusChange('rejected')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition min-h-[44px] ${
              resolutionStatus === 'rejected'
                ? 'bg-rose-600/20 text-rose-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Reject
          </button>
        </div>

        {!expanded && (
          <input
            type="text"
            value={resolutionNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder="Notes required…"
            className="flex-1 min-w-[120px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder:text-zinc-600 px-3 py-2 min-h-[44px] outline-none focus:border-rose-500/30"
          />
        )}

        <div className="flex items-center gap-2 ml-auto">
          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs text-zinc-500 hover:text-white px-2 py-2 min-h-[44px]"
            >
              More options
            </button>
          )}
          <Button
            onClick={handleConfirmClick}
            disabled={assignmentLoading}
            className={`min-h-[44px] px-4 font-semibold ${
              resolutionStatus === 'resolved'
                ? 'bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white'
                : 'bg-rose-600 text-white hover:bg-rose-600 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DisputeResolutionDock;
