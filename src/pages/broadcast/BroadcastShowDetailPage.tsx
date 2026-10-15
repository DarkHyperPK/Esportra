import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AnimatePresence, Reorder } from 'framer-motion';
import { Plus, PanelLeft, PanelRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CommandShell, CommandSection, CommandButton, CommandIconButton,
  CommandEmptyState, CommandTabButton, CommandShowHeader,
} from '@/components/management/CommandSurface';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { EYEBROW_CLASS } from '@/components/ui/kit/tone';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RundownRow } from '@/components/broadcast/RundownRow';
import { MatchSlotPlanner } from '@/components/broadcast/MatchSlotPlanner';
import { ConflictCard } from '@/components/broadcast/ConflictCard';
import { BroadcastResultReview } from '@/components/broadcast/BroadcastResultReview';
import { useBroadcastShow, usePushShowConfig, useUpdateShowStatus } from '@/hooks/useBroadcastShow';
import { useBroadcastSponsors } from '@/hooks/useBroadcastSponsors';
import {
  useBroadcastShowSegments, useAddSegment, useUpdateSegment,
  useRemoveSegment, useReorderSegments,
} from '@/hooks/useBroadcastShowSegments';
import { useResolveConflict } from '@/hooks/useResolveConflict';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSignalR } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ShowSegment, ConflictData } from '@/types/broadcast';

type RightTab = 'matches' | 'talent' | 'sponsors' | 'reports';

export default function BroadcastShowDetailPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const { data: show, isLoading, isError } = useBroadcastShow(showId);
  const { data: segments = [], isLoading: segmentsLoading } = useBroadcastShowSegments(showId);
  const { data: sponsors = [] } = useBroadcastSponsors(showId);

  const addSegment = useAddSegment(showId);
  const updateSegment = useUpdateSegment(showId);
  const removeSegment = useRemoveSegment(showId);
  const reorderSegments = useReorderSegments(showId);
  const pushConfig = usePushShowConfig(showId);
  const updateStatus = useUpdateShowStatus(showId);

  const [localSegments, setLocalSegments] = useState<ShowSegment[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('matches');
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);
  const [goLiveConfirmOpen, setGoLiveConfirmOpen] = useState(false);
  const [endShowConfirmOpen, setEndShowConfirmOpen] = useState(false);

  // T35: Conflict card state
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [conflictResolved, setConflictResolved] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const resolveConflict = useResolveConflict(showId);

  // T35: Subscribe to broadcast hub ResultConflict events (page-level subscription).
  const { getConnection } = useSignalR();
  const hubRef = useRef(getConnection(HubPaths.Broadcast, { autoStart: true }));

  useEffect(() => {
    const conn = hubRef.current;

    function handleResultConflict(payload: {
      correctionId: string;
      sessionId: string;
      mapNumber: number;
      submittedA: number;
      submittedB: number;
      gepA: number;
      gepB: number;
    }) {
      setConflictResolved(false);
      setConflictError(null);
      setConflictData({
        correctionId: payload.correctionId,
        sessionId: payload.sessionId,
        mapNumber: payload.mapNumber,
        submittedA: payload.submittedA,
        submittedB: payload.submittedB,
        gepA: payload.gepA,
        gepB: payload.gepB,
      });
    }

    conn.on('ResultConflict', handleResultConflict);
    return () => { conn.off('ResultConflict', handleResultConflict); };
  }, []);

  async function handleResolveWithGep() {
    if (!conflictData) return;
    try {
      await resolveConflict.mutateAsync({
        sessionId: conflictData.sessionId,
        mapNumber: conflictData.mapNumber,
        teamAScore: conflictData.gepA,
        teamBScore: conflictData.gepB,
      });
      setConflictResolved(true);
      setTimeout(() => setConflictData(null), 2000);
    } catch (err) {
      setConflictError(getApiErrorMessage(err, "Could not apply score. Try again."));
    }
  }

  async function handleKeepSubmitted() {
    if (!conflictData) return;
    try {
      await resolveConflict.mutateAsync({
        sessionId: conflictData.sessionId,
        mapNumber: conflictData.mapNumber,
        teamAScore: conflictData.submittedA,
        teamBScore: conflictData.submittedB,
      });
      setConflictResolved(true);
      setTimeout(() => setConflictData(null), 2000);
    } catch (err) {
      setConflictError(getApiErrorMessage(err, "Could not apply score. Try again."));
    }
  }

  // Sync local segments when server data changes
  React.useEffect(() => {
    setLocalSegments(segments);
  }, [segments]);

  const isLive = show?.status === 'live';
  const isEnded = show?.status === 'ended';
  const isClosed = isEnded || show?.status === 'cancelled';
  const locked = isLive || isClosed;

  const handleReorder = useCallback((newOrder: ShowSegment[]) => {
    setLocalSegments(newOrder);
  }, []);

  const handleReorderEnd = useCallback(() => {
    const unchanged = localSegments.every((seg, i) => seg.id === segments[i]?.id);
    if (unchanged) return;
    void reorderSegments.mutateAsync(localSegments).catch(error => {
      setLocalSegments(segments);
      toast.error(getApiErrorMessage(error, 'Could not save screen order. Previous order restored.'));
    });
  }, [localSegments, segments, reorderSegments]);

  async function handleAddSegment() {
    try {
      await addSegment.mutateAsync({
        type: localSegments.length ? 'break' : 'pre_show',
        title: localSegments.length ? 'Break' : 'Opening',
        displayOrder: localSegments.length,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add screen.'));
    }
  }

  async function handleRemoveSegment(segmentId: string) {
    try {
      await removeSegment.mutateAsync(segmentId);
      if (expandedId === segmentId) setExpandedId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not remove segment.'));
    }
  }

  async function handleSegmentChange(patch: Partial<ShowSegment> & { id: string }) {
    try {
      await updateSegment.mutateAsync(patch);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save change.'));
    }
  }

  async function handleSync() {
    try {
      await pushConfig.mutateAsync();
      toast.success('Configuration sent. Verify it in the desktop app.');
    } catch {
      toast.error('Sync failed. Check node connection.');
    }
  }

  async function handleGoLive() {
    try {
      await updateStatus.mutateAsync('live');
      setGoLiveConfirmOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not go live.'));
    }
  }

  async function handleEndShow() {
    try {
      await updateStatus.mutateAsync('ended');
      setEndShowConfirmOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not end show.'));
    }
  }

  if (isLoading) {
    return (
      <CommandShell>
        <div className="h-[52px] animate-pulse bg-white/[0.03]" />
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_280px]">
          <div className="hidden space-y-3 border-r border-white/10 p-4 md:block">
            {[1, 2, 3].map((n) => <div key={n} className="h-10 animate-pulse bg-white/[0.03]" />)}
          </div>
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((n) => <div key={n} className="h-14 animate-pulse bg-white/[0.03]" />)}
          </div>
        </div>
      </CommandShell>
    );
  }

  if (isError || !show) {
    return (
      <CommandShell>
        <CommandSection>
          <CommandEmptyState
            title="Couldn't load show"
            description="Check your connection."
            action={<CommandButton variant="ghost" onClick={() => navigate('/broadcast/shows')}>Back to shows</CommandButton>}
          />
        </CommandSection>
      </CommandShell>
    );
  }

  const headerActions = (
    <>
      <CommandButton
        variant="ghost"
        size="sm"
        onClick={() => void handleSync()}
        disabled={pushConfig.isPending || isClosed}
        title={isClosed ? 'Show is closed' : undefined}
      >
        {pushConfig.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Sync to node
      </CommandButton>
      {isLive ? (
        <CommandButton variant="danger" size="sm" onClick={() => setEndShowConfirmOpen(true)}>
          End show
        </CommandButton>
      ) : !isClosed ? (
        <CommandButton variant="primary" slide size="sm" onClick={() => setGoLiveConfirmOpen(true)}>
          Mark show live
        </CommandButton>
      ) : null}
    </>
  );

  const leftContent = (
    <div className="space-y-0">
      <CommandSection>
        <p className={EYEBROW_CLASS}>SHOW</p>
        <p className="mt-1 text-base font-bold text-white">{show.title}</p>
        <div className="mt-2">
          <StatusPill tone={show.status === 'live' ? 'accent' : 'neutral'} label={show.status} />
        </div>
        {(show.scheduledAt || show.startedAt) && (
          <p className="mt-1 font-mono text-[11px] text-zinc-500">
            {new Date(show.scheduledAt ?? show.startedAt ?? '').toLocaleString()}
          </p>
        )}
        {show.tournamentName && (
          <p className="mt-1 text-sm text-zinc-400 underline">{show.tournamentName}</p>
        )}
      </CommandSection>
      <CommandSection>
        {show.tournamentSlug && <CommandButton variant="ghost" size="sm" className="mb-2 w-full" asChild><Link to={`/organizer/tournament/${encodeURIComponent(show.tournamentSlug)}?tab=broadcast`}>Tournament broadcast →</Link></CommandButton>}
        <CommandButton variant="ghost" size="sm" className="w-full" asChild>
          <Link to={`/broadcast/shows/${showId}/setup`}>Prepare & settings →</Link>
        </CommandButton>
        <CommandButton variant="ghost" size="sm" className="mt-2 w-full" asChild><Link to={`/broadcast/shows/${showId}/activity`}>Recorded activity →</Link></CommandButton>
      </CommandSection>
    </div>
  );

  const rightTabs: RightTab[] = isEnded
    ? ['matches', 'talent', 'sponsors', 'reports']
    : ['matches', 'talent', 'sponsors'];

  const rightContent = (
    <div>
      <div className="flex border-b border-white/10">
        {rightTabs.map((t) => (
          <CommandTabButton
            key={t}
            active={rightTab === t}
            onClick={() => setRightTab(t)}
            className="flex-1 capitalize"
          >
            {t}
          </CommandTabButton>
        ))}
      </div>
      <div className="overflow-y-auto p-3 text-sm text-zinc-400">
        {rightTab === 'matches' && (
          <MatchSlotPlanner show={show} />
        )}
        {rightTab === 'talent' && (
          <div>
            {show.talentCount > 0
              ? <p className="text-sm text-zinc-400">{show.talentCount} talent member{show.talentCount !== 1 ? 's' : ''} configured.</p>
              : <p className="text-sm text-zinc-500">No talent configured.</p>
            }
            <Link to={`/broadcast/shows/${showId}/crew`} className="mt-2 block text-[11px] text-zinc-400 underline">Manage crew and talent →</Link>
          </div>
        )}
        {rightTab === 'sponsors' && (
          sponsors.length === 0 ? (
            <p className="mt-4 text-center text-zinc-600">No sponsors configured.</p>
          ) : (
            <div>
              {sponsors.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-2 border-b border-white/5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', s.isActive ? 'bg-emerald-400' : 'bg-zinc-600')} />
                  <span className="text-sm text-white truncate">{s.name}</span>
                </div>
              ))}
            </div>
          )
        )}
        {rightTab === 'reports' && isEnded && (
          <div className="space-y-px">
            {[
              {
                href: `/broadcast/shows/${showId}/sponsor-proof`,
                label: 'Sponsor proof →',
                desc: 'On-air time per sponsor, ready to export.',
              },
              {
                href: `/broadcast/shows/${showId}/vod-chapters`,
                label: 'VOD chapters →',
                desc: 'Timestamps for your video editor.',
              },
              {
                href: `/broadcast/shows/${showId}/report`,
                label: 'Post-show report →',
                desc: 'Complete production record.',
              },
            ].map(({ href, label, desc }) => (
              <Link key={href} to={href} className="block border-b border-white/5 py-3 hover:bg-white/[0.02]">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{desc}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <CommandShell>
      <CommandShowHeader
        showTitle={show.title}
        showStatus={show.status}
        backHref="/broadcast/shows"
        actions={headerActions}
      />

      {/* Mobile sheet triggers */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0a0a0c]/92 px-3 py-2 md:hidden">
        <CommandIconButton variant="ghost" label="Show info" onClick={() => setLeftSheetOpen(true)}>
          <PanelLeft />
        </CommandIconButton>
        <CommandIconButton variant="ghost" label="Quick view" onClick={() => setRightSheetOpen(true)}>
          <PanelRight />
        </CommandIconButton>
      </div>

      <div className="grid grid-cols-1 gap-0 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_280px]" style={{ height: 'calc(100vh - 52px)' }}>
        {/* Left panel */}
        <aside className="hidden overflow-y-auto border-r border-white/10 md:block">
          {leftContent}
        </aside>

        {/* Centre panel */}
        <main className="flex flex-col overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a0a0c]/95 px-4 py-3">
            <p className="font-heading text-base font-bold text-white">Broadcast screens</p>
            <div className="flex items-center gap-2">
              {show.nodeCount === 0 && !isLive && (
                <span className="hidden text-[11px] text-amber-400 md:inline">No nodes paired</span>
              )}
              <CommandButton variant="ghost" size="sm" onClick={() => void handleAddSegment()} disabled={locked || addSegment.isPending}>
                {addSegment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add screen
              </CommandButton>
            </div>
          </div>

          {show.nodeCount === 0 && !isLive && (
            <InlineNotice tone="warning" className="mx-4 mt-3">
              No nodes paired. Pair a node before going live.{' '}
              <Link to={`/broadcast/shows/${showId}/nodes`} className="underline">Node monitor →</Link>
            </InlineNotice>
          )}

          {isEnded && (
            <InlineNotice tone="neutral" className="mx-4 mt-3">This show has ended.</InlineNotice>
          )}

          <BroadcastResultReview showId={showId!} />
          {/* T35: Conflict card — appears above the broadcast screens on ResultConflict event */}
          <AnimatePresence>
            {conflictData && (
              <ConflictCard
                matchCode={null}
                mapNumber={conflictData.mapNumber}
                submittedA={conflictData.submittedA}
                submittedB={conflictData.submittedB}
                gepA={conflictData.gepA}
                gepB={conflictData.gepB}
                isResolving={resolveConflict.isPending}
                resolveError={conflictError}
                resolved={conflictResolved}
                onUseGep={() => void handleResolveWithGep()}
                onKeepSubmitted={() => void handleKeepSubmitted()}
              />
            )}
          </AnimatePresence>

          {/* sr-only keyboard instructions */}
          <p className="sr-only">
            Drag to reorder. Or use keyboard: focus a row then Alt+Up or Alt+Down.
          </p>

          {segmentsLoading ? (
            <div className="space-y-px p-4">
              {[1, 2, 3, 4].map((n) => <div key={n} className="h-14 animate-pulse bg-white/[0.03]" />)}
            </div>
          ) : localSegments.length === 0 ? (
            <CommandEmptyState
              className="m-4 border-dashed"
              title="No segments yet"
              description="Add a segment to build the broadcast screens."
              action={
                <CommandButton variant="ghost" onClick={() => void handleAddSegment()} disabled={locked}>
                  Add screen
                </CommandButton>
              }
            />
          ) : (
            <Reorder.Group
              axis="y"
              values={localSegments}
              onReorder={handleReorder}
              className="flex-1"
              onMouseUp={handleReorderEnd}
              onTouchEnd={handleReorderEnd}
            >
              {localSegments.map((seg, i) => (
                <RundownRow
                  key={seg.id}
                  segment={seg}
                  index={i}
                  isExpanded={expandedId === seg.id}
                  onExpand={() => setExpandedId(seg.id)}
                  onCollapse={() => setExpandedId(null)}
                  onChange={(patch) => void handleSegmentChange({ id: seg.id, ...patch })}
                  onRemove={() => void handleRemoveSegment(seg.id)}
                  isLive={locked}
                  reduceMotion={reduceMotion}
                />
              ))}
            </Reorder.Group>
          )}
        </main>

        {/* Right panel */}
        <aside className="hidden overflow-y-auto border-l border-white/10 xl:block">
          {rightContent}
        </aside>
      </div>

      {/* Mobile Sheets */}
      <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
        <SheetContent side="left" className="w-[280px] bg-[#0a0a0c] p-0">
          {leftContent}
        </SheetContent>
      </Sheet>
      <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
        <SheetContent side="right" className="w-[280px] bg-[#0a0a0c] p-0">
          {rightContent}
        </SheetContent>
      </Sheet>

      {/* Go Live confirm */}
      <AlertDialog open={goLiveConfirmOpen} onOpenChange={setGoLiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark show live</AlertDialogTitle>
            <AlertDialogDescription>
              Record the show start time on the platform. Start the broadcast screens and switch OBS scenes on the production desk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction autoFocus onClick={() => void handleGoLive()}>
              Mark show live
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Show confirm */}
      <AlertDialog open={endShowConfirmOpen} onOpenChange={setEndShowConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End show</AlertDialogTitle>
            <AlertDialogDescription>Finalizes the platform show and reports. Ended shows cannot be restarted. Stop the desktop broadcast screens and capture separately; OBS keeps its current program output.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep show live</AlertDialogCancel>
            <AlertDialogAction
              autoFocus
              onClick={() => void handleEndShow()}
              className="rounded-none border-red-500/35 bg-red-950/20 text-red-100"
            >
              End show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CommandShell>
  );
}
