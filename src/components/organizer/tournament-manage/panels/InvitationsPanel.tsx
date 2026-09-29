import { useState } from 'react';
import { Loader2, Send, RotateCcw, X, Upload, AlertTriangle } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandEmptyState,
} from '@/components/management/CommandSurface';
import { useToast } from '@/hooks/use-toast';
import { useTournamentInvitations } from '@/hooks/useTournamentInvitations';
import type { TournamentInvitation, InvitationStatus } from '@/types/invitation';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface InvitationsPanelProps {
  tournament: DashboardTournament;
  canActAsOwner: boolean;
}

const STATUS_CONFIG: Record<InvitationStatus, { bg: string; border: string; text: string; label: string }> = {
  draft:    { bg: 'bg-zinc-800',       border: 'border-zinc-600',       text: 'text-zinc-400',    label: 'Draft' },
  sent:     { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-400',    label: 'Sent' },
  expired:  { bg: 'bg-zinc-700/50',    border: 'border-zinc-600',       text: 'text-zinc-500',    label: 'Expired' },
  redeemed: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'Redeemed' },
  revoked:  { bg: 'bg-zinc-800',       border: 'border-zinc-700',       text: 'text-zinc-600',    label: 'Revoked' },
};

function StatusBadge({ status }: { status: InvitationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function InvitationRow({
  inv,
  canActAsOwner,
  onSend,
  onResend,
  onRevoke,
  busy,
}: {
  inv: TournamentInvitation;
  canActAsOwner: boolean;
  onSend: (id: string) => void;
  onResend: (id: string) => void;
  onRevoke: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{inv.email}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {inv.code && (
            <span className="font-mono text-[10px] tracking-wider text-zinc-600">{inv.code}</span>
          )}
          {inv.expiresAt && inv.status === 'sent' && (
            <span className="text-[10px] text-zinc-600">
              Expires {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {inv.teamName && (
            <span className="text-[10px] text-emerald-600">↳ {inv.teamName}</span>
          )}
        </div>
      </div>

      <StatusBadge status={inv.status} />

      {canActAsOwner && (
        <div className="flex shrink-0 items-center gap-1">
          {inv.status === 'draft' && (
            <button
              type="button"
              onClick={() => onSend(inv.id)}
              disabled={busy}
              title="Send this invitation"
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-rose-400 transition-colors hover:text-rose-300 disabled:opacity-50"
            >
              <Send className="h-3 w-3" /> Send
            </button>
          )}
          {(inv.status === 'sent' || inv.status === 'expired') && (
            <button
              type="button"
              onClick={() => onResend(inv.id)}
              disabled={busy}
              title="Resend invitation email"
              className="flex h-6 w-6 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            </button>
          )}
          {(inv.status === 'draft' || inv.status === 'sent') && (
            <button
              type="button"
              onClick={() => onRevoke(inv.id)}
              disabled={busy}
              title="Revoke invitation"
              className="flex h-6 w-6 items-center justify-center text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function InvitationsPanel({ tournament, canActAsOwner }: InvitationsPanelProps) {
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState('');
  const [stagedEmails, setStagedEmails] = useState<string[]>([]);
  const [showCsv, setShowCsv] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    invitations: invQuery,
    createDrafts,
    sendInvites,
    revokeInvite,
    resendInvites,
    importCsv,
  } = useTournamentInvitations(tournament.id, { list: true });

  const data = invQuery.data;
  const summary = data?.summary;
  const allInvitations = data?.invitations ?? [];
  const draftInvitations = allInvitations.filter((i) => i.status === 'draft');

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || stagedEmails.includes(trimmed)) return;
    setStagedEmails((prev) => [...prev, trimmed]);
    setEmailInput('');
  };

  const handleSendCodes = async () => {
    const emails = [...stagedEmails];
    if (emails.length === 0) return;
    try {
      const drafted = await createDrafts.mutateAsync({ emails });
      const ids = drafted.map((d) => d.id);
      await sendInvites.mutateAsync({ invitationIds: ids });
      toast({ title: `${emails.length} invitation${emails.length > 1 ? 's' : ''} sent` });
      setStagedEmails([]);
    } catch (err: any) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSendAllDrafts = async () => {
    try {
      await sendInvites.mutateAsync({});
      toast({ title: `${draftInvitations.length} draft invitation${draftInvitations.length > 1 ? 's' : ''} sent` });
    } catch (err: any) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSendOne = async (id: string) => {
    setBusyId(id);
    try {
      await sendInvites.mutateAsync({ invitationIds: [id] });
      toast({ title: 'Invitation sent' });
    } catch (err: any) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleResend = async (id: string) => {
    setBusyId(id);
    try {
      await resendInvites.mutateAsync({ invitationIds: [id] });
      toast({ title: 'Invitation resent' });
    } catch (err: any) {
      toast({ title: 'Resend failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusyId(id);
    try {
      await revokeInvite.mutateAsync(id);
      toast({ title: 'Invitation revoked' });
    } catch (err: any) {
      toast({ title: 'Revoke failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    try {
      const result = await importCsv.mutateAsync({ csvContent: csvText });
      if (result.inviteIds.length > 0) {
        await sendInvites.mutateAsync({ invitationIds: result.inviteIds });
      }
      toast({
        title: `${result.imported} imported`,
        description: result.skipped > 0 ? `${result.skipped} skipped (already invited or invalid)` : undefined,
      });
      setCsvText('');
      setShowCsv(false);
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    }
  };

  const isSending = createDrafts.isPending || sendInvites.isPending;

  const effectiveSlots = summary?.reservedSlots ?? 0;
  const remainingSlots = (summary?.remainingSlots ?? 0) - stagedEmails.length;

  return (
    <>
      <CommandHeader
        eyebrow="OPERATIONS"
        title="Invitations"
        description="Invite specific participants by email. They receive a unique code to register."
      />

      {/* No slots configured warning */}
      {effectiveSlots === 0 && (
        <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="text-xs font-medium text-amber-200">
            No invite slots reserved. Configure reserved slots in{' '}
            <button
              type="button"
              onClick={() => {/* navigate to registration tab */}}
              className="underline hover:text-amber-100"
            >
              Registration settings
            </button>{' '}
            before sending invitations.
          </span>
        </div>
      )}

      {/* Slot summary */}
      <div className="flex flex-wrap divide-x divide-white/[0.06] border-b border-white/[0.06]">
        {[
          { label: 'Reserved', value: summary?.reservedSlots ?? 0, tone: '' },
          { label: 'Active', value: summary?.activeSlots ?? 0, tone: '' },
          { label: 'Redeemed', value: summary?.usedSlots ?? 0, tone: 'text-emerald-300' },
          { label: 'Remaining', value: remainingSlots, tone: remainingSlots > 0 ? 'text-white' : 'text-zinc-600' },
        ].map(({ label, value, tone }) => (
          <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">{label}</span>
            <span className={`text-sm font-bold ${tone || 'text-white'}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      {allInvitations.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-white/[0.06] px-4 py-2.5">
          {(['draft', 'sent', 'redeemed', 'expired', 'revoked'] as InvitationStatus[]).map((s) => {
            const count = allInvitations.filter((i) => i.status === s).length;
            if (count === 0) return null;
            const cfg = STATUS_CONFIG[s];
            return (
              <span key={s} className={`font-mono text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>
                {count} {cfg.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Send all drafts banner */}
      {draftInvitations.length > 0 && canActAsOwner && (
        <div className="flex items-center justify-between border-b border-rose-500/20 bg-rose-500/[0.04] px-4 py-2.5">
          <span className="text-xs text-zinc-300">
            {draftInvitations.length} draft invitation{draftInvitations.length > 1 ? 's' : ''} not yet sent
          </span>
          <button
            type="button"
            onClick={handleSendAllDrafts}
            disabled={sendInvites.isPending}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-rose-400 transition-colors hover:text-rose-300 disabled:opacity-50"
          >
            {sendInvites.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Send All
          </button>
        </div>
      )}

      {/* Send form */}
      {canActAsOwner && effectiveSlots > 0 && (
        <CommandSection>
          <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">INVITE BY EMAIL</p>
          <div className="space-y-3">
            {/* Single email input */}
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); } }}
                placeholder="player@email.com"
                className="flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                disabled={!emailInput.trim()}
                className="border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {/* Staged email tags */}
            {stagedEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {stagedEmails.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1 border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-300"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setStagedEmails((prev) => prev.filter((e) => e !== email))}
                      className="text-zinc-600 hover:text-zinc-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendCodes}
                disabled={stagedEmails.length === 0 || isSending}
                className="flex items-center gap-1.5 border border-white/15 bg-rose-500/[0.06] px-4 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send {stagedEmails.length > 0 ? `${stagedEmails.length} Code${stagedEmails.length > 1 ? 's' : ''}` : 'Codes'}
              </button>
              <button
                type="button"
                onClick={() => setShowCsv((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                <Upload className="h-3.5 w-3.5" />
                CSV Import
              </button>
            </div>

            {/* CSV import */}
            {showCsv && (
              <div className="space-y-2 border-t border-white/[0.06] pt-3">
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Paste email addresses, comma or line separated (max 500)"
                  rows={4}
                  className="w-full resize-none border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-rose-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCsvImport}
                  disabled={!csvText.trim() || importCsv.isPending}
                  className="flex items-center gap-1.5 border border-white/10 px-4 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
                >
                  {importCsv.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Import &amp; Send
                </button>
              </div>
            )}
          </div>
        </CommandSection>
      )}

      {/* Invitations list */}
      <CommandSection>
        <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">
          ALL INVITATIONS ({allInvitations.length})
        </p>

        {invQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : allInvitations.length === 0 ? (
          <CommandEmptyState
            icon={<Send className="h-5 w-5" />}
            title="No invitations yet"
            description={effectiveSlots > 0 ? 'Use the form above to invite participants.' : 'Configure reserved slots in Registration settings first.'}
          />
        ) : (
          <div>
            {allInvitations.map((inv) => (
              <InvitationRow
                key={inv.id}
                inv={inv}
                canActAsOwner={canActAsOwner}
                onSend={handleSendOne}
                onResend={handleResend}
                onRevoke={handleRevoke}
                busy={busyId === inv.id}
              />
            ))}
          </div>
        )}
      </CommandSection>
    </>
  );
}
