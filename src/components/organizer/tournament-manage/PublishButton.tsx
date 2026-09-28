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
import { CommandButton } from '@/components/management/CommandSurface';
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

const PANEL_LABELS: Record<string, string> = {
  'basic-info': 'Basic Info',
  'format-stages': 'Format & Stages',
  'registration': 'Registration',
  'prize-payouts': 'Prize & Payouts',
  'branding': 'Branding',
  'settings': 'Settings',
};

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

  const { canPublish, totalRequiredMissing, totalRecommendedMissing, panels } = completionSummary;
  const isAlreadyPublished = tournament.status !== 'draft';
  const blocked = !canPublish || !canActAsOwner;

  if (isAlreadyPublished) return null;

  const handleClick = () => {
    if (blocked) return;
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

  // Collect recommended-missing sections for the soft-gap dialog
  const missingRecommended = Object.entries(panels)
    .filter(([, state]) => state.recommendedMissing.length > 0)
    .map(([id, state]) => ({ id, fields: state.recommendedMissing }));

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
          <motion.div
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="w-full"
          >
            <CommandButton
              onClick={handleClick}
              disabled={blocked || publishing}
              variant={blocked ? 'ghost' : 'primary'}
              size="sm"
              slide={!blocked}
              title={blocked ? 'Complete required sections to publish' : 'Publish Tournament'}
              className="w-full"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
            </CommandButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Soft-gap dialog (recommended incomplete) */}
      <AlertDialog open={dialog === 'soft-gap'} onOpenChange={(o) => !o && setDialog('none')}>
        <AlertDialogContent className="border-white/10 bg-[#0d0d0f] text-white">
          <AlertDialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center border border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <AlertDialogTitle>Missing Recommended Fields</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-zinc-400">
                <p>
                  These fields are not required to publish, but improve the participant experience.
                </p>
                {missingRecommended.length > 0 && (
                  <ul className="space-y-2">
                    {missingRecommended.map(({ id, fields }) => (
                      <li key={id}>
                        <span className="text-xs font-semibold text-zinc-300">
                          {PANEL_LABELS[id] ?? id}
                        </span>
                        <ul className="mt-0.5 list-disc pl-4">
                          {fields.map((f) => (
                            <li key={f} className="text-xs text-zinc-500">{f}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-white">
              Go Back
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => setDialog('confirm')}
              className="border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-amber-300 transition-colors hover:border-amber-500 hover:text-white"
            >
              Publish Anyway
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

          {/* Visibility selector — stacked */}
          <div className="flex flex-col gap-2 py-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={[
                'flex items-center gap-3 border p-4 text-left transition-colors',
                isPublic
                  ? 'border-white/40 bg-white/[0.06] text-white'
                  : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20',
              ].join(' ')}
            >
              <Globe className={`h-5 w-5 shrink-0 ${isPublic ? 'text-rose-400' : ''}`} />
              <div>
                <p className="text-sm font-bold uppercase tracking-wider">Public</p>
                <p className="text-xs text-zinc-500">Discoverable by all players</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={[
                'flex items-center gap-3 border p-4 text-left transition-colors',
                !isPublic
                  ? 'border-white/40 bg-white/[0.06] text-white'
                  : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20',
              ].join(' ')}
            >
              <Lock className={`h-5 w-5 shrink-0 ${!isPublic ? 'text-rose-400' : ''}`} />
              <div>
                <p className="text-sm font-bold uppercase tracking-wider">Private</p>
                <p className="text-xs text-zinc-500">Invite-only via direct link</p>
              </div>
            </button>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={publishing}
              className="border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <CommandButton
              onClick={handlePublish}
              disabled={publishing}
              variant="primary"
              size="sm"
              slide
              className="gap-2"
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              Publish
            </CommandButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
