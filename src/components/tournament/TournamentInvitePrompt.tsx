import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getGameBannerUrl } from '@/utils/gameFeatures';
import { getManifestGameAssets } from '@/hooks/useRawgGame';
import {
  buildRedeemInvitePath,
  findNextUnreadTournamentInvite,
  getTournamentInviteFromNotification,
} from '@/utils/tournamentInviteNotification';

const DISMISSED_KEY = 'esportra:dismissed-tournament-invites';

/** Invites dismissed with "Not now" stay unread in the inbox but don't pop up again this session. */
function readDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage unavailable (private mode): the in-memory set still hides it for this page.
  }
}

export function TournamentInvitePrompt() {
  const { user, loading: authLoading } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissed);
  const [copying, setCopying] = useState(false);

  const activeNotification = useMemo(
    () => findNextUnreadTournamentInvite(notifications, dismissedIds),
    [notifications, dismissedIds],
  );

  const inviteDetails = useMemo(
    () => (activeNotification ? getTournamentInviteFromNotification(activeNotification) : null),
    [activeNotification],
  );

  const shouldShow = Boolean(user && !authLoading && inviteDetails);

  const bannerUrl = useMemo(() => {
    const game = inviteDetails?.data.game;
    if (!game) return null;
    return getGameBannerUrl(game) ?? getManifestGameAssets(game).banner;
  }, [inviteDetails?.data.game]);

  const tournamentName =
    inviteDetails?.data.tournament_name
    ?? inviteDetails?.title.replace(/^You're invited to\s+/i, '')
    ?? 'this tournament';

  const tournamentKey =
    inviteDetails?.data.tournament_id
    ?? null;

  const inviteCode = inviteDetails?.data.code ?? '';

  const handleDismiss = useCallback(() => {
    if (!activeNotification) return;
    setDismissedIds((current) => {
      const next = new Set(current).add(activeNotification.id);
      writeDismissed(next);
      return next;
    });
  }, [activeNotification]);

  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast({
        title: 'Code copied',
        description: 'Paste it on the redeem page when you’re ready.',
      });
    } catch {
      toast({
        title: 'Couldn’t copy the code',
        description: 'Select it and copy it manually.',
        variant: 'destructive',
      });
    } finally {
      setCopying(false);
    }
  }, [inviteCode, toast]);

  const handleRedeem = useCallback(async () => {
    if (!inviteCode) return;

    const destination = buildRedeemInvitePath(inviteCode, tournamentKey);
    handleDismiss();
    if (activeNotification) await markAsRead(activeNotification.id);
    navigate(destination);
  }, [activeNotification, handleDismiss, inviteCode, markAsRead, navigate, tournamentKey]);

  useEffect(() => {
    if (!shouldShow) return;
    setCopying(false);
  }, [shouldShow, activeNotification?.id]);

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md [&>button]:z-20 [&>button]:bg-black/50 [&>button]:backdrop-blur-sm">
        {bannerUrl ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
            <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
          </div>
        ) : null}

        <div className={bannerUrl ? 'px-6 pb-6 pt-2' : 'px-6 pb-6 pt-6'}>
          <DialogHeader className="space-y-2 text-left">
            <p className={EYEBROW_CLASS}>Tournament invite</p>
            <DialogTitle className="font-heading text-2xl font-bold tracking-tight text-white">
              You’re invited to {tournamentName}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-zinc-400">
              A team slot is reserved for you. Redeem the code to claim it.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 border border-white/10 bg-black/30 px-4 py-4">
            <p className={EYEBROW_CLASS}>Invite code</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="select-all font-mono text-2xl font-bold tracking-[0.3em] text-white">{inviteCode}</p>
              <CommandButton variant="ghost" size="sm" onClick={() => void handleCopyCode()} disabled={copying} aria-label="Copy invite code">
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </CommandButton>
            </div>
          </div>

          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-0">
            <CommandButton variant="ghost" onClick={handleDismiss}>Not now</CommandButton>
            <CommandButton variant="primary" slide onClick={() => void handleRedeem()}>Redeem invite</CommandButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
