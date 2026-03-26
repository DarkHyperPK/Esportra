import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, User, Clock } from 'lucide-react';
import DisputeIdStrip from './DisputeIdStrip';
import DisputeEvidencePanel, { type DisputeReport, type DisputeRiotAccount } from './DisputeEvidencePanel';
import DisputeConversation from './DisputeConversation';
import DisputeActions from './DisputeActions';

const statusConfig = {
  open: { icon: AlertCircle, label: 'Open', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  resolved: { icon: CheckCircle, label: 'Closed', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  rejected: { icon: XCircle, label: 'Closed', cls: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
} as const;

interface Dispute {
  id: string;
  reference_number?: string | null;
  title: string;
  description: string | null;
  status: 'open' | 'resolved' | 'rejected';
  match_id: string | null;
  raised_by_name?: string;
  team_name?: string;
  created_at: string;
  evidence_url: string | null;
  resolution_notes: string | null;
  assigned_to_user_id: string | null;
  assigned_to_name?: string;
  match?: {
    match_number?: number;
    best_of?: number;
    team1_name?: string;
    team2_name?: string;
    team1_score?: number;
    team2_score?: number;
    team1_id?: string;
    team2_id?: string;
  } | null;
  reports?: DisputeReport[];
  riot_accounts?: DisputeRiotAccount[];
}

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name?: string;
  is_internal: boolean;
  attachment_url?: string;
}

interface DisputeDetailPanelProps {
  dispute: Dispute;
  comments: Comment[];
  loadingComments: boolean;
  submittingComment: boolean;
  uploadingAttachment: boolean;
  organizerId: string;
  staffUserIds: string[];
  canAssist: boolean;
  canAssignOthers: boolean;
  assigneeId: string | null;
  assignmentOptions: { value: string; label: string }[];
  assignmentLoading: boolean;
  resolutionNotes: string;
  resolutionStatus: 'resolved' | 'rejected';
  onAssigneeChange: (id: string) => void;
  onAssign: () => void;
  onResolutionStatusChange: (status: 'resolved' | 'rejected') => void;
  onResolutionNotesChange: (notes: string) => void;
  onResolve: () => void;
  onCommentSubmit: (text: string, attachment: File | null) => void;
  onImageClick: (url: string) => void;
}

const DisputeDetailPanel: React.FC<DisputeDetailPanelProps> = ({
  dispute, comments, loadingComments, submittingComment, uploadingAttachment,
  organizerId, staffUserIds, canAssist, canAssignOthers,
  assigneeId, assignmentOptions, assignmentLoading,
  resolutionNotes, resolutionStatus,
  onAssigneeChange, onAssign, onResolutionStatusChange, onResolutionNotesChange,
  onResolve, onCommentSubmit, onImageClick,
}) => {
  const cfg = statusConfig[dispute.status];
  const StatusIcon = cfg.icon;

  // Guard against jsonb returning a string instead of a parsed array
  const safeReports: DisputeReport[] = (() => {
    let r = dispute.reports;
    if (!r) return [];
    if (typeof r === 'string') { try { r = JSON.parse(r); } catch { return []; } }
    return Array.isArray(r) ? r : [];
  })();

  const safeRiotAccounts: DisputeRiotAccount[] = (() => {
    let r = dispute.riot_accounts;
    if (!r) return [];
    if (typeof r === 'string') { try { r = JSON.parse(r); } catch { return []; } }
    return Array.isArray(r) ? r : [];
  })();

  const riotMatchIds = safeReports
    .map(r => r.riot_match_id)
    .filter((v, i, a) => v && a.indexOf(v) === i) as string[];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.06] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-heading font-bold text-white truncate mb-1">
              {dispute.reference_number && (
                <span className="text-rose-400/70 font-mono text-sm mr-2">{dispute.reference_number}</span>
              )}
              {dispute.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{dispute.raised_by_name}</span>
              {dispute.team_name && <span className="text-zinc-500">({dispute.team_name})</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(dispute.created_at).toLocaleString()}</span>
            </div>
          </div>
          <Badge className={`text-xs shrink-0 ${cfg.cls}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {cfg.label}
          </Badge>
        </div>

        {/* IDs strip */}
        <DisputeIdStrip disputeId={dispute.id} referenceNumber={dispute.reference_number} matchId={dispute.match_id} riotMatchIds={riotMatchIds} />
      </div>

      {/* ─── Scrollable Evidence/Context — capped at 40% ─── */}
      <div className="shrink overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin" style={{ maxHeight: '40%' }}>
        {/* Match Context */}
        {dispute.match && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold text-sm">{dispute.match.team1_name || 'Team 1'}</span>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#0a0a0c] border border-white/[0.06]">
                  <span className="text-white font-mono font-bold text-lg">{dispute.match.team1_score ?? 0}</span>
                  <span className="text-zinc-600 text-xs">–</span>
                  <span className="text-white font-mono font-bold text-lg">{dispute.match.team2_score ?? 0}</span>
                </div>
                <span className="text-white font-semibold text-sm">{dispute.match.team2_name || 'Team 2'}</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-white/[0.06] text-zinc-500">
                Match #{dispute.match.match_number} · BO{dispute.match.best_of || 1}
              </Badge>
            </div>
          </div>
        )}

        {/* Description */}
        {dispute.description && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Description</h3>
            <p className="text-sm text-zinc-300 leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              {dispute.description}
            </p>
          </div>
        )}

        {/* Evidence URL */}
        {dispute.evidence_url && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Uploaded Evidence</h3>
            <img
              src={dispute.evidence_url}
              alt="Dispute evidence"
              className="max-w-full max-h-48 rounded-lg border border-white/[0.06] cursor-pointer hover:opacity-80 hover:border-rose-500/30 transition group relative"
              onClick={() => onImageClick(dispute.evidence_url!)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Reports + Riot Accounts from enriched data */}
        <DisputeEvidencePanel
          reports={safeReports}
          riotAccounts={safeRiotAccounts}
          matchContext={dispute.match ? {
            team1_name: dispute.match.team1_name,
            team2_name: dispute.match.team2_name,
            team1_id: dispute.match.team1_id,
            team2_id: dispute.match.team2_id,
            best_of: dispute.match.best_of,
          } : null}
          onImageClick={onImageClick}
        />

        {/* Resolution notes (for closed disputes) */}
        {dispute.resolution_notes && (
          <div className="border-l-2 border-blue-500/40 pl-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Resolution</h3>
            {dispute.assigned_to_name && (
              <p className="text-xs text-zinc-500 mb-1">
                {dispute.status === 'resolved' ? 'Resolved' : 'Rejected'} by <span className="text-white font-medium">{dispute.assigned_to_name}</span>
              </p>
            )}
            <p className="text-sm text-zinc-300">{dispute.resolution_notes}</p>
          </div>
        )}

        {/* Actions */}
        <DisputeActions
          status={dispute.status}
          canAssist={canAssist}
          canAssignOthers={canAssignOthers}
          assigneeId={assigneeId}
          assignmentOptions={assignmentOptions}
          assignmentLoading={assignmentLoading}
          resolutionNotes={resolutionNotes}
          resolutionStatus={resolutionStatus}
          resolvedByName={dispute.assigned_to_name}
          onAssigneeChange={onAssigneeChange}
          onAssign={onAssign}
          onStatusChange={onResolutionStatusChange}
          onNotesChange={onResolutionNotesChange}
          onResolve={onResolve}
        />
      </div>

      {/* ─── Conversation (fills remaining space with own scroller) ─── */}
      <div className="flex-1 border-t border-white/[0.06] px-5 py-3 flex flex-col overflow-hidden" style={{ minHeight: '280px' }}>
        <DisputeConversation
          comments={comments}
          loading={loadingComments}
          organizerId={organizerId}
          staffUserIds={staffUserIds}
          canComment={canAssist && dispute.status === 'open'}
          submitting={submittingComment}
          uploading={uploadingAttachment}
          onSubmit={onCommentSubmit}
          onImageClick={onImageClick}
        />
      </div>
    </div>
  );
};

export { statusConfig };
export type { Dispute as DetailDispute, Comment as DetailComment };
export default DisputeDetailPanel;
