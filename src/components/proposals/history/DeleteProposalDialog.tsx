import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Proposal } from '@/schemas/proposal';

interface DeleteProposalDialogProps {
  proposal: Proposal | null;
  onCancel: () => void;
  onConfirm: (proposal: Proposal) => void;
}

/** Names the consequence: a deleted proposal can't be recovered unless it was exported. */
export function DeleteProposalDialog({ proposal, onCancel, onConfirm }: DeleteProposalDialogProps) {
  const name = proposal?.prospect.brandName.trim() || proposal?.title || 'this proposal';
  return (
    <AlertDialog open={proposal !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent className="rounded-none border-white/10 bg-[#0a0a0c]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            It is removed from this browser. You can only get it back from an exported file.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none">Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-none bg-red-600 text-white hover:bg-red-500"
            onClick={() => proposal && onConfirm(proposal)}
          >
            Delete proposal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
