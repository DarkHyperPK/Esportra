import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle } from 'lucide-react';

interface DisputeActionsProps {
  status: 'open' | 'resolved' | 'rejected';
  canAssist: boolean;
  canAssignOthers: boolean;
  assigneeId: string | null;
  assignmentOptions: { value: string; label: string }[];
  assignmentLoading: boolean;
  resolutionNotes: string;
  resolutionStatus: 'resolved' | 'rejected';
  resolvedByName?: string | null;
  onAssigneeChange: (id: string) => void;
  onAssign: () => void;
  onStatusChange: (status: 'resolved' | 'rejected') => void;
  onNotesChange: (notes: string) => void;
  onResolve: () => void;
}

const DisputeActions: React.FC<DisputeActionsProps> = ({
  status, canAssist, canAssignOthers: _canAssignOthers,
  assigneeId, assignmentOptions, assignmentLoading,
  resolutionNotes, resolutionStatus, resolvedByName,
  onAssigneeChange, onAssign, onStatusChange, onNotesChange,
  onResolve,
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
    <div className="space-y-4">
      {/* Assignment */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold shrink-0">Assign to</span>
        <Select value={assigneeId || ''} onValueChange={onAssigneeChange} disabled={isClosed}>
          <SelectTrigger className="bg-[#0a0a0c] border-white/[0.06] text-white h-8 text-sm flex-1">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent className="bg-[#121214] border-white/[0.06] text-white">
            {assignmentOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isClosed && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAssign}
            disabled={assignmentLoading}
            className="border-white/[0.06] text-zinc-300 hover:bg-white/[0.04] h-8 text-xs"
          >
            {assignmentLoading ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>

      {/* Resolve/Reject for open disputes */}
      {!isClosed && (
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={resolutionStatus === 'resolved' ? 'default' : 'outline'}
              onClick={() => onStatusChange('resolved')}
              className={resolutionStatus === 'resolved'
                ? 'bg-emerald-600 hover:bg-emerald-500 flex-1 h-9'
                : 'border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] flex-1 h-9'}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Resolve
            </Button>
            <Button
              size="sm"
              variant={resolutionStatus === 'rejected' ? 'default' : 'outline'}
              onClick={() => onStatusChange('rejected')}
              className={resolutionStatus === 'rejected'
                ? 'bg-rose-600 hover:bg-rose-500 flex-1 h-9'
                : 'border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] flex-1 h-9'}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
            </Button>
          </div>
          <Textarea
            value={resolutionNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Resolution notes (required)…"
            className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-zinc-600 min-h-[70px] text-sm rounded-xl"
          />
          <Button
            onClick={onResolve}
            disabled={!resolutionNotes.trim()}
            className={`w-full h-9 text-sm font-semibold ${
              resolutionStatus === 'resolved'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {resolutionStatus === 'resolved' ? 'Resolve Dispute' : 'Reject Dispute'}
          </Button>
        </div>
      )}

      {/* Closed state */}
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
