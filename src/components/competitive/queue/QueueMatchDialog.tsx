import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { QueueMatch } from '@/schemas/lfgQueue';

interface QueueMatchDialogProps {
  match: QueueMatch | null;
  sessionEnded: boolean;
  onClose: () => void;
}

export function QueueMatchDialog({ match, sessionEnded, onClose }: QueueMatchDialogProps) {
  const riotId = match?.riotGameName ? `${match.riotGameName}#${match.riotTagLine ?? ''}` : null;
  return (
    <Dialog open={!!match} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogTitle>It&apos;s a match!</DialogTitle>
        <DialogDescription>
          You and {match?.matchedUsername} want to queue together.
          {riotId && <> Add them in-game: <strong>{riotId}</strong>.</>}
          {sessionEnded && <> You have everyone you were looking for, so your queue session is over.</>}
        </DialogDescription>
        <div className="queue-actions">
          <button type="button" className="lfg-button" onClick={onClose}>{sessionEnded ? 'See summary' : 'Keep swiping'}</button>
          {match?.conversationId && (
            <Link className="lfg-button lfg-button-primary" to={`/inbox/${match.conversationId}`} onClick={onClose}>Open chat</Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
