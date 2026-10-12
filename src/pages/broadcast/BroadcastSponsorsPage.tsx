import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Reorder } from 'framer-motion';
import { ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CommandShell, CommandPageGrid, CommandHeader, CommandSection,
  CommandButton, CommandEmptyState, CommandShowHeader,
} from '@/components/management/CommandSurface';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { CONTROL_CLASS } from '@/components/ui/kit/tone';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SponsorCard } from '@/components/broadcast/SponsorCard';
import { useBroadcastShow } from '@/hooks/useBroadcastShow';
import {
  useBroadcastSponsors, useAddSponsor, useEditSponsor,
  useDeleteSponsor, useToggleSponsor, useReorderSponsors,
  uploadSponsorLogo,
} from '@/hooks/useBroadcastSponsors';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getApiErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import type { BroadcastSponsor } from '@/types/broadcast';

interface SponsorFormState {
  name: string;
  displaySlot: string;
  logoUrl: string;
  isActive: boolean;
}

const EMPTY_FORM: SponsorFormState = { name: '', displaySlot: 'lower_third', logoUrl: '', isActive: true };

export default function BroadcastSponsorsPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const reduceMotion = useReducedMotion();

  const { data: show } = useBroadcastShow(showId);
  const { data: sponsors = [], isLoading } = useBroadcastSponsors(showId);

  const addSponsor = useAddSponsor(showId);
  const editSponsor = useEditSponsor(showId);
  const deleteSponsor = useDeleteSponsor(showId);
  const toggleSponsor = useToggleSponsor(showId);
  const reorderSponsors = useReorderSponsors(showId);

  const [localSponsors, setLocalSponsors] = useState<BroadcastSponsor[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BroadcastSponsor | null>(null);
  const [form, setForm] = useState<SponsorFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<BroadcastSponsor | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalSponsors(sponsors);
  }, [sponsors]);

  const showTitle = show?.title ?? '…';
  const showStatus = show?.status === 'scheduled' ? 'draft' : (show?.status ?? 'draft');

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setLogoFile(null);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(sponsor: BroadcastSponsor) {
    setEditTarget(sponsor);
    setForm({ name: sponsor.name, displaySlot: sponsor.displaySlot, logoUrl: sponsor.logoUrl ?? '', isActive: sponsor.isActive });
    setLogoFile(null);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    setFormError(null);
    try {
      let logoUrl = form.logoUrl;

      if (logoFile) {
        setLogoUploading(true);
        const tempId = editTarget?.id ?? `temp-${Date.now()}`;
        logoUrl = await uploadSponsorLogo(logoFile, showId, tempId);
        setLogoUploading(false);
      }

      if (editTarget) {
        await editSponsor.mutateAsync({ id: editTarget.id, ...form, logoUrl: logoUrl || undefined });
        toast.success('Sponsor updated.');
      } else {
        await addSponsor.mutateAsync({ ...form, logoUrl: logoUrl || undefined });
        toast.success('Sponsor added.');
      }
      setModalOpen(false);
    } catch (err) {
      setLogoUploading(false);
      setFormError(getApiErrorMessage(err, 'Could not save sponsor.'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSponsor.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not remove sponsor.'));
    }
  }

  const addButton = (
    <CommandButton variant="primary" slide onClick={openAdd}>
      Add sponsor
    </CommandButton>
  );

  const isPending = addSponsor.isPending || editSponsor.isPending || logoUploading;

  return (
    <CommandShell>
      <CommandShowHeader
        showTitle={showTitle}
        showStatus={showStatus as 'draft' | 'live' | 'ended'}
        backHref={`/broadcast/shows/${showId}`}
        backLabel="Back to show"
        actions={addButton}
      />

      <CommandPageGrid>
        <CommandHeader
          eyebrow={`BROADCAST · ${showTitle.toUpperCase()}`}
          title="Sponsors"
          actions={addButton}
        />

        <CommandSection>
          <InlineNotice tone="neutral">
            Drag cards to set the display order. Inactive sponsors are excluded from HUD rotations.
          </InlineNotice>
        </CommandSection>

        <CommandSection className="p-4">
          {isLoading ? (
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-[200px] w-[180px] animate-pulse bg-white/[0.03]" />
              ))}
            </div>
          ) : localSponsors.length === 0 ? (
            <CommandEmptyState
              icon={<ImageIcon className="h-6 w-6" />}
              title="No sponsors"
              description="Add a sponsor to include them in HUD overlays."
              action={addButton}
            />
          ) : (
            <Reorder.Group
              axis="y"
              values={localSponsors}
              onReorder={setLocalSponsors}
              className="flex flex-wrap gap-3"
              onMouseUp={() => void reorderSponsors.mutateAsync(localSponsors)}
              onTouchEnd={() => void reorderSponsors.mutateAsync(localSponsors)}
            >
              {localSponsors.map((sponsor, i) => (
                <SponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  index={i}
                  reduceMotion={reduceMotion}
                  onEdit={() => openEdit(sponsor)}
                  onToggleActive={(active) =>
                    void toggleSponsor.mutateAsync({ sponsorId: sponsor.id, isActive: active })
                  }
                  isTogglePending={
                    toggleSponsor.isPending && toggleSponsor.variables?.sponsorId === sponsor.id
                  }
                />
              ))}
            </Reorder.Group>
          )}
        </CommandSection>
      </CommandPageGrid>

      {/* Add / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) setModalOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="normal-case tracking-normal">
              {editTarget ? 'Edit sponsor' : 'Add sponsor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <InlineNotice tone="critical">{formError}</InlineNotice>}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-zinc-200" htmlFor="sp-name">Name</label>
              <input
                id="sp-name"
                className={cn(CONTROL_CLASS, 'w-full px-3')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={isPending}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-zinc-200" htmlFor="sp-slot">Display slot</label>
              <select
                id="sp-slot"
                className={cn(CONTROL_CLASS, 'w-full rounded-none px-3')}
                value={form.displaySlot}
                onChange={(e) => setForm((f) => ({ ...f, displaySlot: e.target.value }))}
                disabled={isPending}
              >
                <option value="lower_third">Lower third</option>
                <option value="bug">Bug</option>
                <option value="full_screen">Full-screen</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-zinc-200" htmlFor="sp-logo">Logo</label>
              {logoUploading && (
                <div className="mb-2 h-0.5 w-full bg-zinc-800">
                  <div className="h-full animate-pulse bg-rose-500" style={{ width: '60%' }} />
                </div>
              )}
              <input
                id="sp-logo"
                type="file"
                accept="image/*"
                className="block w-full text-sm text-zinc-400 file:mr-3 file:border-0 file:bg-white/[0.05] file:px-3 file:py-1.5 file:text-xs file:font-mono file:uppercase file:text-white"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <CommandButton variant="ghost" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancel
            </CommandButton>
            <CommandButton variant="primary" slide onClick={() => void handleSubmit()} disabled={isPending || !form.name.trim()}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editTarget ? 'Save' : 'Add sponsor'}
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name ?? 'this sponsor'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This sponsor will be removed from all HUD rotations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              autoFocus
              onClick={() => void handleDelete()}
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
