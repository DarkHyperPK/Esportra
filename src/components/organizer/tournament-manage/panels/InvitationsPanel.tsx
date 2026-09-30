import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Send, RotateCcw, X, Upload } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CommandButton,
  CommandHeader,
  CommandSection,
  CommandEmptyState,
} from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CONTROL_CLASS, CONTROL_ERROR_CLASS, EYEBROW_CLASS, Field, FORM_MEASURE_CLASS, InlineNotice, StatusPill, type Tone } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTournamentInvitations } from '@/hooks/useTournamentInvitations';
import type { TournamentInvitation, InvitationStatus } from '@/types/invitation';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface InvitationsPanelProps {
  tournament: DashboardTournament;
  canActAsOwner: boolean;
}

const STATUS: Record<InvitationStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Not sent', tone: 'warning' },
  sent: { label: 'Sent', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
  redeemed: { label: 'Joined', tone: 'success' },
  revoked: { label: 'Revoked', tone: 'neutral' },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    <div className="flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{inv.email}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-zinc-500">
          {inv.code && <span className="font-mono tracking-wider">{inv.code}</span>}
          {inv.expiresAt && inv.status === 'sent' && (
            <span>Expires {new Date(inv.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          )}
          {inv.teamName && <span className="text-zinc-300">Joined as {inv.teamName}</span>}
        </div>
      </div>

      <StatusPill label={STATUS[inv.status]?.label ?? inv.status} tone={STATUS[inv.status]?.tone ?? 'neutral'} />

      {canActAsOwner && (
        <div className="flex shrink-0 items-center gap-1">
          {inv.status === 'draft' && (
            <button
              type="button"
              onClick={() => onSend(inv.id)}
              disabled={busy}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-zinc-200 transition-colors hover:text-white disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden /> Send
            </button>
          )}
          {(inv.status === 'sent' || inv.status === 'expired') && (
            <button
              type="button"
              onClick={() => onResend(inv.id)}
              disabled={busy}
              title="Send the email again"
              aria-label={`Send the invite to ${inv.email} again`}
              className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            </button>
          )}
          {(inv.status === 'draft' || inv.status === 'sent') && (
            <button
              type="button"
              onClick={() => onRevoke(inv.id)}
              disabled={busy}
              title="Revoke: the code stops working"
              aria-label={`Revoke the invite for ${inv.email}`}
              className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
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
  const [showCsvConfirm, setShowCsvConfirm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [, setSearchParams] = useSearchParams();

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
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError('That doesn’t look like an email address.');
      return;
    }
    if (stagedEmails.includes(trimmed) || allInvitations.some((i) => i.email.toLowerCase() === trimmed && i.status !== 'revoked')) {
      setEmailError('That address already has an invite.');
      return;
    }
    setEmailError(null);
    setStagedEmails((prev) => [...prev, trimmed]);
    setEmailInput('');
  };

  const handleSendCodes = async () => {
    const emails = [...stagedEmails];
    if (emails.length === 0) return;
    if (remainingSlots <= 0) {
      toast({ title: 'No slots available', description: 'All reserved invite slots are taken.', variant: 'destructive' });
      return;
    }
    try {
      const drafted = await createDrafts.mutateAsync({ emails });
      const ids = drafted.map((d) => d.id);
      await sendInvites.mutateAsync({ invitationIds: ids });
      toast({ title: `${emails.length} invite${emails.length > 1 ? 's' : ''} sent`, description: 'Each person gets a code that holds their spot.' });
      setStagedEmails([]);
    } catch (err: any) {
      toast({ title: "Couldn't send", description: err.message, variant: 'destructive' });
    }
  };

  const handleSendAllDrafts = async () => {
    try {
      await sendInvites.mutateAsync({});
      toast({ title: `${draftInvitations.length} invite${draftInvitations.length > 1 ? 's' : ''} sent` });
    } catch (err: any) {
      toast({ title: "Couldn't send", description: err.message, variant: 'destructive' });
    }
  };

  const handleSendOne = async (id: string) => {
    setBusyId(id);
    try {
      await sendInvites.mutateAsync({ invitationIds: [id] });
      toast({ title: 'Invite sent' });
    } catch (err: any) {
      toast({ title: "Couldn't send", description: err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleResend = async (id: string) => {
    setBusyId(id);
    try {
      await resendInvites.mutateAsync({ invitationIds: [id] });
      toast({ title: 'Invite sent again' });
    } catch (err: any) {
      toast({ title: "Couldn't send it again", description: err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusyId(id);
    try {
      await revokeInvite.mutateAsync(id);
      toast({ title: 'Invite revoked', description: 'The code no longer works, and the spot is free again.' });
    } catch (err: any) {
      toast({ title: "Couldn't revoke", description: err.message, variant: 'destructive' });
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
        title: `${result.imported} invite${result.imported === 1 ? '' : 's'} sent`,
        description: result.skipped > 0 ? `${result.skipped} skipped because they were already invited or not valid addresses.` : undefined,
      });
      setCsvText('');
      setShowCsv(false);
    } catch (err: any) {
      toast({ title: "Couldn't import", description: err.message, variant: 'destructive' });
    }
  };

  const isSending = createDrafts.isPending || sendInvites.isPending;

  const effectiveSlots = summary?.reservedSlots ?? 0;
  const remainingSlots = (summary?.remainingSlots ?? 0) - stagedEmails.length;

  const parsedEmailCount = csvText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

  const counts = (['draft', 'sent', 'redeemed', 'expired', 'revoked'] as InvitationStatus[])
    .map((status) => ({ status, count: allInvitations.filter((i) => i.status === status).length }))
    .filter((c) => c.count > 0);

  return (
    <>
      <CommandHeader
        eyebrow="Community"
        title="Invitations"
        description="Hold spots for specific teams. Each invite emails a code that only works for that address."
      />

      <dl className="grid grid-cols-2 gap-px border-b border-white/[0.07] bg-white/[0.06] sm:grid-cols-4">
        {[
          { label: 'Spots held', value: summary?.reservedSlots ?? 0 },
          { label: 'Invites out', value: summary?.activeSlots ?? 0 },
          { label: 'Joined', value: summary?.usedSlots ?? 0 },
          { label: 'Still free', value: Math.max(remainingSlots, 0) },
        ].map((stat) => (
          <div key={stat.label} className="bg-card px-5 py-4 sm:px-6">
            <dt className={EYEBROW_CLASS}>{stat.label}</dt>
            <dd className="mt-1 font-heading text-2xl font-black tabular-nums text-white">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {effectiveSlots === 0 && (
        <CommandSection>
          <InlineNotice
            tone="warning"
            title="No spots are held for invites yet"
            action={canActAsOwner ? (
              <CommandButton variant="secondary" size="sm" onClick={() => setSearchParams({ tab: 'registration' }, { replace: true })}>
                Open Registration
              </CommandButton>
            ) : undefined}
          >
            Turn on “Hold spots for invited teams” in Registration and choose how many, then come back to send codes.
          </InlineNotice>
        </CommandSection>
      )}

      {draftInvitations.length > 0 && canActAsOwner && (
        <CommandSection>
          <InlineNotice
            tone="warning"
            action={
              <CommandButton variant="primary" size="sm" onClick={handleSendAllDrafts} disabled={sendInvites.isPending}>
                {sendInvites.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Sending" /> : <>Send {draftInvitations.length}</>}
              </CommandButton>
            }
          >
            {draftInvitations.length} invite{draftInvitations.length > 1 ? 's are' : ' is'} saved but not sent. Nobody receives a code until you send it.
          </InlineNotice>
        </CommandSection>
      )}

      {canActAsOwner && effectiveSlots > 0 && (
        <CommandSection>
          <div className={cn(FORM_MEASURE_CLASS, 'space-y-4')}>
            <Field label="Invite by email" htmlFor="inv-email" error={emailError ?? undefined}
              hint="Add as many addresses as you like, then send them together. Usually the team captain.">
              <div className="flex gap-2">
                <Input
                  id="inv-email" type="email" value={emailInput} placeholder="captain@team.com"
                  onChange={(e) => { setEmailInput(e.target.value); setEmailError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); } }}
                  className={cn(CONTROL_CLASS, 'flex-1', emailError && CONTROL_ERROR_CLASS)}
                />
                <CommandButton variant="secondary" size="sm" onClick={handleAddEmail} disabled={!emailInput.trim()} className="h-11">
                  Add
                </CommandButton>
              </div>
            </Field>

            {stagedEmails.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Addresses to invite">
                {stagedEmails.map((email) => (
                  <li key={email} className="flex items-center gap-1 bg-white/[0.05] py-1 pl-2.5 pr-1 text-xs text-zinc-200">
                    {email}
                    <button type="button" onClick={() => setStagedEmails((prev) => prev.filter((e) => e !== email))}
                      className="p-0.5 text-zinc-500 hover:text-white" aria-label={`Remove ${email}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <CommandButton variant="primary" size="sm" slide onClick={handleSendCodes} disabled={stagedEmails.length === 0 || isSending || remainingSlots <= 0}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Sending" /> : <Send className="h-4 w-4" aria-hidden />}
                {stagedEmails.length > 0 ? `Send ${stagedEmails.length} invite${stagedEmails.length > 1 ? 's' : ''}` : 'Send invites'}
              </CommandButton>
              <button type="button" onClick={() => setShowCsv((v) => !v)} aria-expanded={showCsv}
                className="flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-white">
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Paste a list instead
              </button>
            </div>

            {showCsv && (
              <Field label="Paste addresses" htmlFor="inv-csv" hint="Separate with commas or new lines. Up to 500. Invites are sent straight away.">
                <div className="space-y-2">
                  <Textarea id="inv-csv" value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={4}
                    placeholder={'captain1@team.com, captain2@team.com\ncaptain3@team.com'}
                    className={cn(CONTROL_CLASS, 'h-auto resize-y py-3 text-sm')} />
                  <CommandButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (parsedEmailCount > Math.max(remainingSlots, 0)) {
                        toast({ title: 'Over capacity', description: `Only ${Math.max(remainingSlots, 0)} slot${remainingSlots === 1 ? '' : 's'} remaining.`, variant: 'destructive' });
                        return;
                      }
                      setShowCsvConfirm(true);
                    }}
                    disabled={!csvText.trim() || importCsv.isPending}
                  >
                    {importCsv.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Importing" /> : <Upload className="h-4 w-4" aria-hidden />}
                    Import and send
                  </CommandButton>
                </div>
              </Field>
            )}
          </div>
        </CommandSection>
      )}

      <CommandSection>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-heading text-base font-bold text-white">All invites</h3>
          {counts.length > 0 && (
            <p className="text-xs text-zinc-500">{counts.map((c) => `${c.count} ${STATUS[c.status].label.toLowerCase()}`).join(' · ')}</p>
          )}
        </div>

        {invQuery.isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading invites">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse bg-white/[0.04]" />)}
          </div>
        ) : allInvitations.length === 0 ? (
          <CommandEmptyState
            icon={<Send className="h-5 w-5" />}
            title="No invites yet"
            description={effectiveSlots > 0 ? 'Add an email above to send the first code.' : 'Hold some spots in Registration first.'}
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

      <AlertDialog open={showCsvConfirm} onOpenChange={setShowCsvConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send invites?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send invitations to {parsedEmailCount} address{parsedEmailCount !== 1 ? 'es' : ''}.
              Invites are sent immediately and cannot be recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCsvImport}>Send invites</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
