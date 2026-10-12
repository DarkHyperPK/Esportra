import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radio, Inbox, Copy, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CommandShell, CommandPageGrid, CommandHeader, CommandSection,
  CommandButton, CommandIconButton, CommandEmptyState, CommandTabs,
} from '@/components/management/CommandSurface';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useMyOrganizationId } from '@/hooks/useMyOrganizationId';
import { createShowSchema } from '@/schemas/broadcastSchema';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  useBroadcastShows, useCreateBroadcastShow,
  useDuplicateBroadcastShow, useDeleteBroadcastShow,
} from '@/hooks/useBroadcastShows';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { BroadcastShow, BroadcastShowStatus } from '@/types/broadcast';

type TabValue = 'all' | 'live' | 'upcoming' | 'ended';

const STATUS_TONE: Record<BroadcastShowStatus, 'neutral' | 'accent' | 'warning'> = {
  draft: 'neutral', scheduled: 'warning', live: 'accent', ended: 'neutral', cancelled: 'neutral',
};

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
];

function filterShows(shows: BroadcastShow[], tab: TabValue): BroadcastShow[] {
  if (tab === 'all') return shows;
  if (tab === 'live') return shows.filter((s) => s.status === 'live');
  if (tab === 'upcoming') return shows.filter((s) => s.status === 'scheduled' || s.status === 'draft');
  return shows.filter((s) => s.status === 'ended');
}

export default function BroadcastShowsPage() {
  const orgId = useMyOrganizationId();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const { data: shows = [], isLoading, isError } = useBroadcastShows(orgId);
  const createMutation = useCreateBroadcastShow(orgId ?? '');
  const duplicateMutation = useDuplicateBroadcastShow(orgId ?? '');
  const deleteMutation = useDeleteBroadcastShow(orgId ?? '');

  const [tab, setTab] = useState<TabValue>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BroadcastShow | null>(null);

  const filtered = filterShows(shows, tab);

  async function handleCreate() {
    setCreateError(null);
    const parsed = createShowSchema.safeParse({ title: createTitle });
    if (!parsed.success) {
      setCreateError(parsed.error.issues[0]?.message ?? 'Invalid title.');
      return;
    }
    try {
      const result = await createMutation.mutateAsync({ title: parsed.data.title });
      setCreateOpen(false);
      setCreateTitle('');
      navigate(`/broadcast/shows/${result.showId}`);
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Could not create the show. Try again.'));
    }
  }

  async function handleDuplicate(show: BroadcastShow) {
    try {
      await duplicateMutation.mutateAsync(show.id);
      toast.success('Show duplicated.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not duplicate. Try again.'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete. Try again.'));
    }
  }

  const newShowButton = (
    <CommandButton variant="primary" slide onClick={() => setCreateOpen(true)}>
      New show
    </CommandButton>
  );

  return (
    <CommandShell>
      <CommandPageGrid>
        <CommandHeader eyebrow="BROADCAST" title="Shows" actions={newShowButton} />

        <CommandTabs
          tabs={TABS}
          active={tab}
          onChange={(v) => setTab(v as TabValue)}
        />

        <CommandSection className="p-0">
          {isLoading ? (
            <div className="divide-y divide-white/5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse bg-white/[0.03]" />
              ))}
            </div>
          ) : isError ? (
            <InlineNotice tone="critical">
              Could not load shows. Refresh to try again.
            </InlineNotice>
          ) : filtered.length === 0 ? (
            tab === 'all' ? (
              <CommandEmptyState
                icon={<Radio className="h-6 w-6" />}
                title="No shows yet"
                description="Create your first broadcast show to start building your production."
                action={newShowButton}
              />
            ) : (
              <CommandEmptyState
                icon={<Inbox className="h-6 w-6" />}
                title={`No ${tab} shows`}
                description="Try a different filter."
              />
            )
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((show, i) => (
                <ShowRow
                  key={show.id}
                  show={show}
                  index={i}
                  reduceMotion={reduceMotion}
                  duplicatePending={duplicateMutation.isPending && duplicateMutation.variables === show.id}
                  onOpen={() => navigate(`/broadcast/shows/${show.id}`)}
                  onDuplicate={() => void handleDuplicate(show)}
                  onDelete={() => setDeleteTarget(show)}
                />
              ))}
            </div>
          )}
        </CommandSection>
      </CommandPageGrid>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setCreateTitle(''); setCreateError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="normal-case tracking-normal">New show</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {createError && <InlineNotice tone="critical">{createError}</InlineNotice>}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-zinc-200" htmlFor="show-title">
                Show title
              </label>
              <Input
                id="show-title"
                placeholder="e.g. Karachi Open Finals Broadcast"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                disabled={createMutation.isPending}
                className="rounded-none"
              />
            </div>
          </div>
          <DialogFooter>
            <CommandButton variant="ghost" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </CommandButton>
            <CommandButton
              variant="primary"
              slide
              onClick={() => void handleCreate()}
              disabled={createMutation.isPending || !createTitle.trim()}
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create show
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this show?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep show</AlertDialogCancel>
            <AlertDialogAction
              autoFocus
              onClick={() => void handleDelete()}
              className="rounded-none border-red-500/35 bg-red-950/20 text-red-100 hover:bg-red-900/30"
            >
              Delete show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CommandShell>
  );
}

interface ShowRowProps {
  show: BroadcastShow;
  index: number;
  reduceMotion: boolean;
  duplicatePending: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ShowRow({ show, index, reduceMotion, duplicatePending, onOpen, onDuplicate, onDelete }: ShowRowProps) {
  const delay = reduceMotion ? 0 : Math.min(index, 7) * 0.025;
  const dateLabel = show.status === 'live'
    ? show.startedAt
    : show.status === 'ended'
      ? show.endedAt
      : show.scheduledAt;

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 34, delay }}
      className="flex min-h-[56px] items-start justify-between gap-4 px-5 py-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {show.status === 'live' && (
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
          )}
          <span className="text-base font-bold text-white">{show.title}</span>
          <StatusPill tone={STATUS_TONE[show.status]} label={show.status} />
          {show.tournamentName && (
            <span className="text-sm text-zinc-400 underline">{show.tournamentName}</span>
          )}
        </div>
        {dateLabel && (
          <span className="font-mono text-[11px] text-zinc-500">
            {new Date(dateLabel).toLocaleString()}
          </span>
        )}
      </div>

      {/* Actions: full set on desktop, condensed on mobile */}
      <div className="flex shrink-0 items-center gap-1.5">
        <CommandButton variant="ghost" size="sm" onClick={onOpen} className="hidden sm:inline-flex">
          Open
        </CommandButton>
        <CommandIconButton variant="ghost" label={`Duplicate ${show.title}`} onClick={onDuplicate} className="hidden sm:inline-flex">
          {duplicatePending ? <Loader2 className="animate-spin" /> : <Copy />}
        </CommandIconButton>
        <CommandIconButton variant="danger" label={`Delete ${show.title}`} onClick={onDelete} className="hidden sm:inline-flex">
          <Trash2 />
        </CommandIconButton>

        {/* Mobile: Open + three-dot menu */}
        <CommandButton variant="ghost" size="sm" onClick={onOpen} className="sm:hidden">
          Open
        </CommandButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="sm:hidden">
            <CommandIconButton variant="ghost" label="More actions">
              <span className="flex flex-col gap-0.5">
                {[0, 1, 2].map((n) => <span key={n} className="block h-0.5 w-3 bg-current" />)}
              </span>
            </CommandIconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-400">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
