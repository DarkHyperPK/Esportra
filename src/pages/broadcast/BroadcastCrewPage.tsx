import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Users, Copy, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CommandShell, CommandPageGrid, CommandHeader, CommandSection,
  CommandButton, CommandIconButton, CommandEmptyState, CommandShowHeader,
} from '@/components/management/CommandSurface';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { EYEBROW_CLASS } from '@/components/ui/kit/tone';
import EntityAvatar from '@/components/ui/EntityAvatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBroadcastShow } from '@/hooks/useBroadcastShow';
import {
  useBroadcastCrew, useCreateCrewInvite,
  useRevokeCrewInvite, useRemoveCrewMember,
} from '@/hooks/useBroadcastCrew';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { BroadcastCrewMember, BroadcastPendingInvite, CrewInviteResult } from '@/types/broadcast';

const INVITE_BASE = `${window.location.origin}/broadcast/join`;

export default function BroadcastCrewPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const reduceMotion = useReducedMotion();

  const { data: show } = useBroadcastShow(showId);
  const { data: crewData, isLoading } = useBroadcastCrew(showId);

  const createInvite = useCreateCrewInvite(showId);
  const revokeInvite = useRevokeCrewInvite(showId);
  const removeCrewMember = useRemoveCrewMember(showId);

  // The raw token is stored in local state only — never in TanStack Query cache.
  const [pendingInviteResult, setPendingInviteResult] = useState<CrewInviteResult | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<BroadcastPendingInvite | null>(null);
  const [removeTarget, setRemoveTarget] = useState<BroadcastCrewMember | null>(null);

  const crew = crewData?.crew ?? [];
  const pendingInvites = crewData?.pendingInvites ?? [];
  const showTitle = show?.title ?? '…';
  const showStatus = show?.status === 'scheduled' ? 'draft' : (show?.status ?? 'draft');

  async function handleGenerateInvite() {
    try {
      const result = await createInvite.mutateAsync('producer');
      setPendingInviteResult(result);
      setInviteModalOpen(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not generate invite link.'));
    }
  }

  const inviteUrl = pendingInviteResult
    ? `${INVITE_BASE}?token=${pendingInviteResult.token}`
    : '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  }, [inviteUrl]);

  function handleCloseInviteModal() {
    setInviteModalOpen(false);
    setPendingInviteResult(null);
    setCopied(false);
  }

  async function handleRevokeInvite() {
    if (!revokeTarget) return;
    try {
      await revokeInvite.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not revoke invite.'));
    }
  }

  async function handleRemoveCrew() {
    if (!removeTarget) return;
    try {
      await removeCrewMember.mutateAsync(removeTarget.userId);
      setRemoveTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not remove crew member.'));
    }
  }

  const generateButton = (
    <CommandButton variant="primary" slide onClick={() => void handleGenerateInvite()} disabled={createInvite.isPending}>
      Generate invite link
    </CommandButton>
  );

  return (
    <CommandShell>
      <CommandShowHeader
        showTitle={showTitle}
        showStatus={showStatus as 'draft' | 'live' | 'ended'}
        backHref={`/broadcast/shows/${showId}`}
        backLabel="Back to show"
        actions={generateButton}
      />

      <CommandPageGrid>
        <CommandHeader
          eyebrow={`BROADCAST · ${showTitle.toUpperCase()}`}
          title="Crew"
          actions={generateButton}
        />

        {/* Invite section */}
        <CommandSection>
          <p className={EYEBROW_CLASS}>INVITE</p>
          <div className="mt-3">
            {pendingInvites.length > 0 ? (
              <InlineNotice tone="warning">
                There is an outstanding invite link. Generate a new one to invalidate it.
              </InlineNotice>
            ) : (
              <InlineNotice tone="neutral">
                Generate a link to invite crew without requiring Esportra usernames.
              </InlineNotice>
            )}
          </div>
          {crew.length === 0 && (
            <div className="mt-4">
              {generateButton}
            </div>
          )}
        </CommandSection>

        {/* Crew table */}
        <CommandSection className="p-0">
          <p className={`${EYEBROW_CLASS} px-5 pt-5`}>CREW</p>
          {isLoading ? (
            <div className="divide-y divide-white/5 mt-3">
              {[1, 2, 3].map((n) => <div key={n} className="h-14 animate-pulse bg-white/[0.03]" />)}
            </div>
          ) : crew.length === 0 ? (
            <CommandEmptyState
              icon={<Users className="h-6 w-6" />}
              title="No crew yet"
              description="Generate an invite link to add crew."
            />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {crew.map((member, i) => (
                <CrewRow
                  key={member.id}
                  member={member}
                  index={i}
                  reduceMotion={reduceMotion}
                  onRemove={() => setRemoveTarget(member)}
                />
              ))}
            </div>
          )}
        </CommandSection>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <CommandSection className="p-0">
            <p className={`${EYEBROW_CLASS} px-5 pt-5`}>PENDING INVITES</p>
            <div className="divide-y divide-white/[0.05]">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-zinc-400">Pending invite</p>
                    <p className="font-mono text-[11px] text-amber-300">
                      Expires in {formatDistanceToNow(new Date(invite.expiresAt))}
                    </p>
                  </div>
                  <CommandButton variant="ghost" size="sm" onClick={() => setRevokeTarget(invite)}>
                    Revoke
                  </CommandButton>
                </div>
              ))}
            </div>
          </CommandSection>
        )}
      </CommandPageGrid>

      {/* Invite link modal */}
      <Dialog open={inviteModalOpen} onOpenChange={(o) => { if (!o) handleCloseInviteModal(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="normal-case tracking-normal">Invite link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <InlineNotice tone="warning">
              This link can be used once. Copy it and share with your crew.
            </InlineNotice>
            <div
              role="textbox"
              aria-readonly="true"
              aria-label="Invite link URL"
              className="break-all border border-white/15 bg-black/30 p-3 font-mono text-sm text-white"
            >
              {inviteUrl}
            </div>
            <div aria-live="polite" aria-atomic className="sr-only">
              {copied ? 'Copied' : ''}
            </div>
            <CommandButton
              variant="primary"
              slide
              className="w-full"
              onClick={() => void handleCopy()}
            >
              {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy link</>}
            </CommandButton>
          </div>
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={handleCloseInviteModal}>
              Close
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => { if (!o) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invite link?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone who has it will no longer be able to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction autoFocus onClick={() => void handleRevokeInvite()}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove crew confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.displayName ?? 'crew member'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeTarget?.displayName ?? 'this person'} from crew?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              autoFocus
              onClick={() => void handleRemoveCrew()}
              className="rounded-none border-red-500/35 bg-red-950/20 text-red-100"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CommandShell>
  );
}

interface CrewRowProps {
  member: BroadcastCrewMember;
  index: number;
  reduceMotion: boolean;
  onRemove: () => void;
}

function CrewRow({ member, index, reduceMotion, onRemove }: CrewRowProps) {
  const delay = reduceMotion ? 0 : Math.min(index, 4) * 0.03;
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 34, delay }}
      className="flex items-center gap-4 border-b border-white/[0.05] px-5 py-3"
    >
      <EntityAvatar src={member.avatarUrl} name={member.displayName} type="user" size="w-8 h-8" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-white">{member.displayName}</p>
        <p className="font-mono text-[11px] text-zinc-500">
          {new Date(member.joinedAt).toLocaleDateString()}
        </p>
      </div>
      <StatusPill tone="neutral" label={member.role} />
      <CommandIconButton variant="ghost" label={`Remove ${member.displayName} from crew`} onClick={onRemove}>
        <Trash2 />
      </CommandIconButton>
    </motion.div>
  );
}
