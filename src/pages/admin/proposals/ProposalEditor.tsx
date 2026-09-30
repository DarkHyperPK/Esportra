import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminPage';
import { CommandButton, CommandSegmentedButton, CommandEmptyState } from '@/components/management/CommandSurface';
import { EditorForm } from '@/components/proposals/editor/EditorForm';
import { ProposalDocument } from '@/components/proposals/document/ProposalDocument';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { useProposalEditor } from '@/hooks/useProposalEditor';
import { kindLabel } from '@/services/proposals/format';

type Pane = 'edit' | 'preview';

export default function ProposalEditor() {
  const { id } = useParams<{ id: string }>();
  const { draft, ops, saveNow, saveState, storageAvailable } = useProposalEditor(id);
  const [pane, setPane] = useState<Pane>('edit');

  if (!draft) {
    return (
      <AdminPage eyebrow="Partners" title="Proposal not found">
        <CommandEmptyState
          title="This proposal isn’t in this browser"
          description="Proposals are saved per browser. Import a backup from your proposals list, or start a new one."
          action={<CommandButton asChild><Link to="/admin/proposals">Back to proposals</Link></CommandButton>}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      eyebrow={kindLabel(draft.kind)}
      title={draft.prospect.brandName.trim() || draft.title}
      description={saveState === 'saving' ? 'Saving…' : 'Saved in this browser.'}
      actions={
        <>
          <CommandButton asChild variant="ghost" size="sm">
            <Link to="/admin/proposals"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />Proposals</Link>
          </CommandButton>
          <CommandSegmentedButton active={draft.theme === 'stage'} onClick={() => ops.set('theme', 'stage')}>Stage</CommandSegmentedButton>
          <CommandSegmentedButton active={draft.theme === 'paper'} onClick={() => ops.set('theme', 'paper')}>Paper</CommandSegmentedButton>
          <CommandButton variant="secondary" size="sm" onClick={saveNow}>Save now</CommandButton>
          <CommandButton asChild size="sm">
            <Link to={`/admin/proposals/${draft.id}/view`}>View and print<ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden /></Link>
          </CommandButton>
        </>
      }
    >
      {!storageAvailable && (
        <InlineNotice tone="warning">
          This browser is blocking storage, so changes won’t persist. Export from your proposals list to keep your work.
        </InlineNotice>
      )}
      <div className="flex gap-2 xl:hidden" role="tablist" aria-label="Editor view">
        <CommandSegmentedButton role="tab" aria-selected={pane === 'edit'} active={pane === 'edit'} onClick={() => setPane('edit')}>Edit</CommandSegmentedButton>
        <CommandSegmentedButton role="tab" aria-selected={pane === 'preview'} active={pane === 'preview'} onClick={() => setPane('preview')}>Preview</CommandSegmentedButton>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <div className={pane === 'edit' ? 'block' : 'hidden xl:block'}>
          <EditorForm doc={draft} ops={ops} />
        </div>
        <div className={`${pane === 'preview' ? 'block' : 'hidden xl:block'} xl:sticky xl:top-4 xl:self-start`}>
          <div className="max-h-[calc(100vh-7rem)] overflow-y-auto border border-white/10">
            <ProposalDocument doc={draft} />
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
