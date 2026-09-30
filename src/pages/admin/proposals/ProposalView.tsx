import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { CommandButton, CommandEmptyState, CommandSegmentedButton } from '@/components/management/CommandSurface';
import { ProposalDocument } from '@/components/proposals/document/ProposalDocument';
import { useProposalHistory } from '@/hooks/useProposalHistory';

/** Full-width, chrome-free view of a saved proposal. The toolbar is hidden when printing. */
export default function ProposalView() {
  const { id } = useParams<{ id: string }>();
  const { get, save } = useProposalHistory();
  const doc = id ? get(id) : undefined;

  if (!doc) {
    return (
      <div className="min-h-screen bg-background p-6">
        <CommandEmptyState
          title="This proposal isn’t in this browser"
          description="Proposals are saved per browser. Import a backup from your proposals list."
          action={<CommandButton asChild><Link to="/admin/proposals">Back to proposals</Link></CommandButton>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-background/95 px-4 py-3 backdrop-blur-sm print:hidden">
        <CommandButton asChild variant="ghost" size="sm">
          <Link to={`/admin/proposals/${doc.id}`}><ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />Back to editor</Link>
        </CommandButton>
        <div className="flex items-center gap-2">
          <CommandSegmentedButton active={doc.theme === 'stage'} onClick={() => save({ ...doc, theme: 'stage' })}>Stage</CommandSegmentedButton>
          <CommandSegmentedButton active={doc.theme === 'paper'} onClick={() => save({ ...doc, theme: 'paper' })}>Paper</CommandSegmentedButton>
          <CommandButton size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />Print or save PDF
          </CommandButton>
        </div>
      </div>
      <ProposalDocument doc={doc} />
    </div>
  );
}
