import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminPage';
import { CommandButton, CommandEmptyState, CommandSegmentedButton } from '@/components/management/CommandSurface';
import { EditorForm } from '@/components/proposals/editor/EditorForm';
import { PreviewPane } from '@/components/proposals/editor/PreviewPane';
import { ReadinessPanel } from '@/components/proposals/editor/ReadinessPanel';
import { anchorFor, scrollBehavior } from '@/components/proposals/editor/sectionAnchors';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { useProposalEditor } from '@/hooks/useProposalEditor';
import { kindLabel } from '@/services/proposals/format';
import { checkReadiness } from '@/services/proposals/readiness';

type Pane = 'edit' | 'preview';

export default function ProposalEditor() {
  const { id } = useParams<{ id: string }>();
  const { draft, ops, saveNow, saveState, storageAvailable } = useProposalEditor(id);
  const [pane, setPane] = useState<Pane>('edit');
  const [open, setOpen] = useState<string[]>(['prospect']);
  const previewRef = useRef<HTMLDivElement>(null);
  const issues = useMemo(() => (draft ? checkReadiness(draft) : []), [draft]);

  const showInPreview = (sectionId: string) => {
    const container = previewRef.current;
    const page = container?.querySelector<HTMLElement>(`[data-doc-section="${anchorFor(sectionId)}"]`);
    if (container && page) container.scrollTo({ top: page.offsetTop, behavior: scrollBehavior() });
  };

  const onOpenChange = (next: string[]) => {
    const added = next.find((value) => !open.includes(value));
    setOpen(next);
    if (added) showInPreview(added);
  };

  const jumpTo = (sectionId: string) => {
    setOpen((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]));
    setPane('edit');
    showInPreview(sectionId);
    // Wait for the section to expand before scrolling to it.
    window.setTimeout(() => {
      document.getElementById(`editor-section-${sectionId}`)?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    }, 220);
  };

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

  const status = saveState === 'saving' ? 'Saving…' : 'Saved in this browser';
  return (
    <AdminPage
      eyebrow={kindLabel(draft.kind)}
      title={draft.prospect.brandName.trim() || 'Untitled proposal'}
      description={`${status} · ${issues.length === 0 ? 'Ready to send' : `${issues.length} to check before sending`}`}
      actions={
        <>
          <CommandButton asChild variant="ghost" size="sm">
            <Link to="/admin/proposals"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden />Proposals</Link>
          </CommandButton>
          <CommandButton asChild size="sm">
            <Link to={`/admin/proposals/${draft.id}/view`} onClick={saveNow}>
              <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />View and print
            </Link>
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div className={`${pane === 'edit' ? 'block' : 'hidden xl:block'} space-y-4`}>
          <ReadinessPanel issues={issues} onJump={jumpTo} />
          <EditorForm doc={draft} ops={ops} open={open} onOpenChange={onOpenChange} issues={issues} />
        </div>
        <div className={`${pane === 'preview' ? 'block' : 'hidden xl:block'} xl:sticky xl:top-4 xl:self-start`}>
          <PreviewPane ref={previewRef} doc={draft} onTheme={(theme) => ops.set('theme', theme)} />
        </div>
      </div>
    </AdminPage>
  );
}
