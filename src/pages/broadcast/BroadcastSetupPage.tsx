import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CommandShell, CommandButton, CommandShowHeader,
} from '@/components/management/CommandSurface';
import { PageIntro } from '@/components/ui/kit/PageIntro';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { SetupChecklist } from '@/components/broadcast/SetupChecklist';
import { useBroadcastShow, usePushShowConfig } from '@/hooks/useBroadcastShow';
import { useBroadcastNodes } from '@/hooks/useBroadcastNodes';
import { useBroadcastShowSegments } from '@/hooks/useBroadcastShowSegments';
import { useBroadcastCrew } from '@/hooks/useBroadcastCrew';
import { useBroadcastSponsors } from '@/hooks/useBroadcastSponsors';
import { useBroadcastSetupStatus } from '@/hooks/useBroadcastSetupStatus';
import { useMyOrganizationId } from '@/hooks/useMyOrganizationId';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getApiErrorMessage } from '@/lib/apiClient';

export default function BroadcastSetupPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const orgId = useMyOrganizationId();
  const reduceMotion = useReducedMotion();

  const { data: show, isLoading: showLoading, isError } = useBroadcastShow(showId);
  const { data: nodes = [] } = useBroadcastNodes(orgId);
  const { data: segments = [] } = useBroadcastShowSegments(showId);
  const { data: crewData } = useBroadcastCrew(showId);
  const { data: sponsors = [] } = useBroadcastSponsors(showId);
  const pushConfig = usePushShowConfig(showId);

  const crew = crewData?.crew ?? [];

  const { steps, completion, completedCount, totalCount, allRequiredDone } =
    useBroadcastSetupStatus({ show, nodes, segments, crew, sponsors, showId });

  const showTitle = show?.title ?? '…';
  const showStatus: 'draft' | 'live' | 'ended' =
    show?.status === 'live' ? 'live'
    : show?.status === 'ended' || show?.status === 'cancelled' ? 'ended'
    : 'draft';
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  async function handleSync() {
    try {
      await pushConfig.mutateAsync();
      toast.success('Config pushed to node.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sync failed. Check node connection.'));
    }
  }

  if (isError) {
    return (
      <CommandShell>
        <CommandShowHeader
          showTitle={showTitle}
          showStatus="draft"
          backHref={`/broadcast/shows/${showId}`}
          backLabel="Back to show"
        />
        <div className="px-6 py-8">
          <InlineNotice tone="critical">
            Couldn't load setup status. Try refreshing.
          </InlineNotice>
        </div>
      </CommandShell>
    );
  }

  return (
    <CommandShell>
      <CommandShowHeader
        showTitle={showTitle}
        showStatus={showStatus}
        backHref={`/broadcast/shows/${showId}`}
        backLabel="Back to show"
        actions={
          allRequiredDone ? (
            <CommandButton
              variant="ghost"
              slide
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              onClick={() => navigate(`/broadcast/shows/${showId}`)}
            >
              Ready to go live →
            </CommandButton>
          ) : undefined
        }
      />

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero + progress */}
        {showLoading ? (
          <div className="h-10 w-24 animate-pulse bg-white/[0.03]" />
        ) : (
          <PageIntro
            eyebrow={`BROADCAST SETUP · ${showTitle.toUpperCase()}`}
            title={
              <span className="font-heading text-4xl font-black text-white sm:text-[48px]">
                {completedCount}/{totalCount} complete
              </span>
            }
            aside={
              allRequiredDone ? (
                <CommandButton
                  variant="ghost"
                  slide
                  className="hidden sm:inline-flex border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  onClick={() => navigate(`/broadcast/shows/${showId}`)}
                >
                  Ready to go live →
                </CommandButton>
              ) : undefined
            }
          />
        )}

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label={`Setup progress: ${completedCount} of ${totalCount} steps complete`}
          className="relative mt-6 h-1 w-full bg-white/10"
        >
          <motion.div
            className="absolute inset-y-0 left-0 bg-rose-500"
            animate={{ width: `${pct}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Checklist */}
        <div className="mt-8 max-w-2xl">
          {showLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse bg-white/[0.03]" />
              ))}
            </div>
          ) : (
            <SetupChecklist
              steps={steps}
              completion={completion}
              reduceMotion={reduceMotion}
              onSync={() => void handleSync()}
            />
          )}
        </div>

        {/* Ready CTA block */}
        <AnimatePresence>
          {allRequiredDone && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0.1 }
                  : { type: 'spring', stiffness: 420, damping: 34 }
              }
              role="status"
              className="mt-10 max-w-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-6"
            >
              <h2 className="font-heading text-2xl font-black text-white">
                Ready to go live.
              </h2>
              <p className="mt-1 text-sm text-zinc-400">All required steps are complete.</p>
              <CommandButton
                variant="ghost"
                slide
                className="mt-4 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                onClick={() => navigate(`/broadcast/shows/${showId}`)}
              >
                Go live →
              </CommandButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CommandShell>
  );
}
