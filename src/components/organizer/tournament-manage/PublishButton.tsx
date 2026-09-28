/**
 * PublishButton.tsx
 *
 * Tournament publish action with:
 * - Full state machine: disabled → enabled → loading → success
 * - Publish dialog (public vs private visibility)
 * - Soft-gap dialog for amber-only missing sections
 * - Blocked when required sections are incomplete
 */

import { useState } from 'react';
import { Loader2, Globe, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import type { CompletionSummary } from '@/hooks/useCompletionState';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface PublishButtonProps {
  tournament: DashboardTournament;
  completionSummary: CompletionSummary;
  canActAsOwner: boolean;
  onPublished: () => void;
}

type DialogMode = 'none' | 'soft-gap' | 'confirm';

export function PublishButton({
  tournament,
  completionSummary,
  canActAsOwner,
  onPublished,
}: PublishButtonProps) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState<DialogMode>('none');
  const [isPublic, setIsPublic] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState(false);

  const { canPublish, totalRequiredMissing, totalRecommendedMissing } = completionSummary;
  const isAlreadyPublished = tournament.status !== 'draft';
  const blocked = !canPublish || !canActAsOwner;

  if (isAlreadyPublished) return null;

  const handleClick = () => {
    if (blocked) return;
    // If only recommended missing — show soft-gap dialog first
    if (totalRequiredMissing === 0 && totalRecommendedMissing > 0) {
      setDialog('soft-gap');
    } else {
      setDialog('confirm');
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        status: 'published',
        isPublic,
      });
      setSuccess(true);
      setDialog('none');
      toast({ title: 'Tournament published', description: 'Your tournament is now live.' });
      onPublished();
    } catch (err: any) {
      toast({
        title: 'Publish failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  const buttonLabel = blocked
    ? 'Complete required sections to publish'
    : 'Publish Tournament';

  return (
    <>
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.2 } }}
            className="flex items-center gap-2 text-sm font-semibold text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4" />
            Published
          </motion.div>
        ) : (
          <motion.button
            key="button"
            type="button"
            disabled={blocked || publishing}
            onClick={handleClick}
            title={buttonLabel}
            className={[
              'flex items-center gap-2 border px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all',
              blocked
                ? 'cursor-not-allowed border-white/10 bg-white/[0.02] text-zinc-600'
                : 'border-rose-500/60 bg-rose-500/[0.12] text-rose-300 hover:border-rose-500 hover:bg-rose-500/20 hover:text-white',
            ].join(' ')}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Publish
          </motion.button>
        )}
      </AnimatePresence>

      {/* Soft-gap dialog (recommended incomplete) */}
      <AlertDialog open={dialog === 'soft-gap'} onOpenChange={(o) => !o && setDialog('none')}>
        <AlertDialogContent className="border-white/10 bg-[#0d0d0f] text-white">
          <AlertDialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center border border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <AlertDialogTitle>Publish with incomplete sections?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {totalRecommendedMissing} recommended{' '}
              {totalRecommendedMissing === 1 ? 'section is' : 'sections are'} incomplete.
              You can still publish — these sections improve the participant experience but are not required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-white">
              Go back
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => setDialog('confirm')}
              className="border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-amber-300 transition-colors hover:border-amber-500 hover:text-white"
            >
              Continue anyway
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm publish dialog */}
      <AlertDialog open={dialog === 'confirm'} onOpenChange={(o) => !o && !publishing && setDialog('none')}>
        <AlertDialogContent className="border-white/10 bg-[#0d0d0f] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Publish tournament</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Choose who can find and join this tournament.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Visibility toggle */}
          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={[
                'flex flex-col items-center gap-2 border p-4 text-center transition-colors',
                isPublic
                  ? 'border-rose-500/60 bg-rose-500/[0.10] text-white'
                  : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20',
              ].join(' ')}
            >
              <Globe className={`h-5 w-5 ${isPublic ? 'text-rose-400' : ''}`} />
              <span className="text-sm font-bold uppercase tracking-wider">Public</span>
              <span className="text-xs text-zinc-500">Discoverable by all players</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={[
                'flex flex-col items-center gap-2 border p-4 text-center transition-colors',
                !isPublic
                  ? 'border-rose-500/60 bg-rose-500/[0.10] text-white'
                  : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20',
              ].join(' ')}
            >
              <Lock className={`h-5 w-5 ${!isPublic ? 'text-rose-400' : ''}`} />
              <span className="text-sm font-bold uppercase tracking-wider">Private</span>
              <span className="text-xs text-zinc-500">Invite-only via direct link</span>
            </button>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={publishing}
              className="border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublish}
              className="flex items-center gap-2 border border-rose-500/60 bg-rose-500/[0.12] px-4 py-2 text-sm font-bold uppercase tracking-wider text-rose-300 transition-colors hover:border-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              Publish
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
