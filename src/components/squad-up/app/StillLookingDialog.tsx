import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CommandButton } from '@/components/management/CommandSurface';

/** Shown after 8 quiet minutes. The server removes idle players at 10, so nobody matches someone who left. */
export function StillLookingDialog({ open, onStay, onLeave }: { open: boolean; onStay: () => void; onLeave: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onStay(); }}>
      <DialogContent className="su-dialog">
        <DialogTitle>Still looking?</DialogTitle>
        <DialogDescription>
          You haven't swiped for a while. In about 2 minutes you'll leave Squad Up so nobody matches with you while you're away.
        </DialogDescription>
        <div className="su-dialog-actions">
          <CommandButton variant="ghost" size="md" onClick={onLeave}>Leave Squad Up</CommandButton>
          <CommandButton variant="primary" size="md" slide onClick={onStay} autoFocus>I'm still looking</CommandButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
