import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSquadUpMatches } from '@/hooks/competitive/useSquadUp';
import { dismissSquadUpLike, dismissSquadUpMatch, useSquadUpPopupState } from '@/hooks/competitive/squadUpPopups';

import './squad-up.css';

const SQUAD_UP_PATH = '/competitive/lfg/squad-up';

/** Mounted once at the app root: shows match and "liked you" popups on any page. */
export function SquadUpPopupHost() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toast } = useToast();
  const { match, like } = useSquadUpPopupState();
  const matches = useSquadUpMatches(!!match && !match.details);
  const details = match?.details ?? matches.data?.find((item) => item.matchId === match?.matchId) ?? null;
  const riotId = details?.riotGameName ? `${details.riotGameName}#${details.riotTagLine ?? ''}` : null;
  const conversationId = details?.conversationId ?? match?.conversationId ?? null;

  useEffect(() => {
    if (!like) return;
    dismissSquadUpLike(qc);
    if (pathname === SQUAD_UP_PATH) return;
    toast({
      title: like.count > 1 ? `${like.count} players want to squad up` : 'A player wants to squad up',
      description: 'Open Squad Up to see who is waiting for you.',
      action: <ToastAction altText="Open Squad Up" onClick={() => navigate(SQUAD_UP_PATH)}>Open</ToastAction>,
      duration: 8000,
    });
  }, [like, pathname, qc, toast, navigate]);

  return (
    <Dialog open={!!match} onOpenChange={(open) => { if (!open) dismissSquadUpMatch(qc); }}>
      <DialogContent>
        <DialogTitle>{match?.title ?? "It's a match!"}</DialogTitle>
        <DialogDescription>
          {details ? <>You and {details.matchedUsername} want to squad up.</> : match?.message}
          {riotId && <> Add them in-game: <strong>{riotId}</strong>.</>}
          {match?.sessionEnded && <> You have everyone you were looking for, so your Squad Up session is over.</>}
        </DialogDescription>
        <div className="squad-actions">
          <button type="button" className="lfg-button" onClick={() => dismissSquadUpMatch(qc)}>
            {match?.sessionEnded ? 'Close' : 'Keep going'}
          </button>
          {conversationId && (
            <Link className="lfg-button lfg-button-primary" to={`/inbox/${conversationId}`} onClick={() => dismissSquadUpMatch(qc)}>
              Open chat
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
