import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, RotateCcw, X, Plus } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandEmptyState,
} from '@/components/management/CommandSurface';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface InvitationsPanelProps {
  tournament: DashboardTournament;
  canActAsOwner: boolean;
}

interface Invitation {
  id: string;
  email: string;
  status: 'draft' | 'sent' | 'expired' | 'redeemed' | 'revoked';
  sent_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  team_name: string | null;
}

interface InvitationSummary {
  reservedSlots: number;
  activeSlots: number;
  usedSlots: number;
  remainingSlots: number;
}

interface InvitationsResponse {
  invitations: Invitation[];
  summary: InvitationSummary;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  draft:   { bg: 'bg-zinc-800',         text: 'text-zinc-400',    label: 'Draft' },
  sent:    { bg: 'bg-rose-500/10',       text: 'text-rose-400',    label: 'Sent' },
  expired: { bg: 'bg-zinc-700/50',       text: 'text-zinc-500',    label: 'Expired' },
  redeemed:{ bg: 'bg-emerald-500/10',    text: 'text-emerald-400', label: 'Redeemed' },
  revoked: { bg: 'bg-zinc-800',          text: 'text-zinc-600',    label: 'Revoked' },
};

export function InvitationsPanel({ tournament, canActAsOwner }: InvitationsPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<InvitationsResponse>({
    queryKey: ['invitations', tournament.id],
    queryFn: () => apiClient.get(`/api/tournaments/${tournament.id}/invitations`),
  });

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: ['invitations', tournament.id] }),
    [qc, tournament.id],
  );

  const handleSend = useCallback(async () => {
    const emails = emailInput
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    setSending(true);
    try {
      await apiClient.post(`/api/tournaments/${tournament.id}/invitations/draft`, { emails });
      toast({ title: `${emails.length} invitation${emails.length > 1 ? 's' : ''} sent` });
      setEmailInput('');
      invalidate();
    } catch (err: any) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }, [emailInput, tournament.id, toast, invalidate]);

  const handleRevoke = useCallback(async (id: string) => {
    setActionId(id);
    try {
      await apiClient.delete(`/api/tournaments/${tournament.id}/invitations/${id}`);
      toast({ title: 'Invitation revoked' });
      invalidate();
    } catch (err: any) {
      toast({ title: 'Revoke failed', description: err.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  }, [tournament.id, toast, invalidate]);

  const handleResend = useCallback(async (id: string) => {
    setActionId(id);
    try {
      await apiClient.post(`/api/tournaments/${tournament.id}/invitations/${id}/resend`, {});
      toast({ title: 'Invitation resent' });
      invalidate();
    } catch (err: any) {
      toast({ title: 'Resend failed', description: err.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  }, [tournament.id, toast, invalidate]);

  const summary = data?.summary;
  const invitations = data?.invitations ?? [];

  return (
    <>
      <CommandHeader
        eyebrow="OPERATIONS"
        title="Invitations"
        description="Send private invitations to specific participants by email."
      />

      {/* Slot summary */}
      {summary && (
        <div className="flex flex-wrap divide-x divide-white/[0.06] border-b border-white/[0.06]">
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Reserved Slots</span>
            <span className="text-sm font-bold text-white">{summary.reservedSlots}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Active</span>
            <span className="text-sm font-bold text-white">{summary.activeSlots}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Redeemed</span>
            <span className="text-sm font-bold text-emerald-300">{summary.usedSlots}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Remaining</span>
            <span className={`text-sm font-bold ${summary.remainingSlots > 0 ? 'text-white' : 'text-zinc-600'}`}>
              {summary.remainingSlots}
            </span>
          </div>
        </div>
      )}

      {/* Send form */}
      {canActAsOwner && (
        <CommandSection>
          <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">SEND INVITATIONS</p>
          <div className="space-y-2">
            <textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter email addresses, comma or line separated"
              rows={3}
              className="w-full resize-none border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-rose-500 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-600">Separate multiple emails with commas or new lines</p>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !emailInput.trim()}
                className="flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/[0.06] px-4 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 disabled:pointer-events-none disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>
          </div>
        </CommandSection>
      )}

      {/* Invitations list */}
      <CommandSection>
        <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">
          SENT ({invitations.length})
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : invitations.length === 0 ? (
          <CommandEmptyState
            icon={<Plus className="h-5 w-5" />}
            title="No invitations sent"
            description="Use the form above to invite participants by email."
          />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {invitations.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
              const busy = actionId === inv.id;
              return (
                <div key={inv.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">{inv.email}</p>
                    {inv.team_name && (
                      <p className="truncate text-xs text-zinc-500">{inv.team_name}</p>
                    )}
                  </div>
                  <span className={`shrink-0 border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text} border-current/20`}>
                    {cfg.label}
                  </span>
                  {canActAsOwner && inv.status !== 'redeemed' && inv.status !== 'revoked' && (
                    <div className="flex shrink-0 items-center gap-1">
                      {(inv.status === 'sent' || inv.status === 'expired') && (
                        <button
                          type="button"
                          onClick={() => handleResend(inv.id)}
                          disabled={busy}
                          title="Resend"
                          className="flex h-6 w-6 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={busy}
                        title="Revoke"
                        className="flex h-6 w-6 items-center justify-center text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CommandSection>
    </>
  );
}
