import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Loader2, Ticket } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
      <DialogContent className="max-w-md border-white/10 bg-[#0a0a0c] p-0 overflow-hidden">
        {bannerUrl ? (
          <div className="relative h-32 w-full overflow-hidden">
            <img
              src={bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
          </div>
        ) : null}

        <div className="px-6 pb-6 pt-5">
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
            <Button
              type="button"
              onClick={() => void handleRedeem()}
              className="w-full bg-rose-500 hover:bg-rose-600"
            >
              Redeem Invite
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopyCode()}
              disabled={copying}
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              Copy Code
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void handleDismiss()}
              className="w-full text-gray-400 hover:text-white"
            >
              Dismiss
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
