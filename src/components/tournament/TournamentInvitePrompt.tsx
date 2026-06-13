import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Loader2, Ticket } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { CtaButton, OutlineButton, GhostButton } from '@/components/ui/app-buttons';
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

export function TournamentInvitePrompt() {
  const { user, loading: authLoading } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
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

  const handleDismiss = useCallback(async () => {
    if (!activeNotification) return;

    setDismissedIds((current) => new Set(current).add(activeNotification.id));
    await markAsRead(activeNotification.id);
  }, [activeNotification, markAsRead]);

  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast({
        title: 'Invite code copied',
        description: 'Paste it on the redemption page when you are ready.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Select the code manually and copy it.',
        variant: 'destructive',
      });
    } finally {
      setCopying(false);
    }
  }, [inviteCode, toast]);

  const handleRedeem = useCallback(async () => {
    if (!inviteCode) return;

    const destination = buildRedeemInvitePath(inviteCode, tournamentKey);
    await handleDismiss();
    navigate(destination);
  }, [handleDismiss, inviteCode, navigate, tournamentKey]);

  useEffect(() => {
    if (!shouldShow) return;
    setCopying(false);
  }, [shouldShow, activeNotification?.id]);

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => { if (!open) void handleDismiss(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-white/10 bg-[#0a0a0c] p-0 sm:max-w-md [&>button]:z-20 [&>button]:border-white/20 [&>button]:bg-black/50 [&>button]:text-white [&>button]:backdrop-blur-sm">
        {bannerUrl ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
            <img
              src={bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/30 to-black/10" />
          </div>
        ) : null}

        <div className={bannerUrl ? 'px-6 pb-6 pt-4' : 'px-6 pb-6 pt-5'}>
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-rose-400">
              <Ticket className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Tournament Invite</span>
            </div>
            <DialogTitle className="text-xl text-white">
              You&apos;re invited to {tournamentName}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-400">
              You have a reserved slot waiting. Use the invite code below to redeem your guaranteed team place.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-200/80">
              Invite Code
            </p>
            <p className="mt-2 font-mono text-2xl font-black tracking-[0.35em] text-white">
              {inviteCode}
            </p>
          </div>

          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            <CtaButton
              type="button"
              className="w-full"
              onClick={() => void handleRedeem()}
            >
              Redeem Invite
            </CtaButton>
            <OutlineButton
              type="button"
              className="w-full"
              onClick={() => void handleCopyCode()}
              disabled={copying}
            >
              {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              Copy Code
            </OutlineButton>
            <GhostButton
              type="button"
              className="w-full"
              onClick={() => void handleDismiss()}
            >
              Dismiss
            </GhostButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
