import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FilePlus2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPage } from '@/components/admin/AdminPage';
import { CommandButton, CommandEmptyState } from '@/components/management/CommandSurface';
import { DeleteProposalDialog } from '@/components/proposals/history/DeleteProposalDialog';
import { ProposalRow } from '@/components/proposals/history/ProposalRow';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { useProposalHistory } from '@/hooks/useProposalHistory';
import type { Proposal, ProposalKind } from '@/schemas/proposal';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

function downloadJson(json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `esportra-proposals-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProposalsHistory() {
  const navigate = useNavigate();
  const { proposals, available, create, duplicate, remove, exportJson, importJson } = useProposalHistory();
  const [pendingDelete, setPendingDelete] = useState<Proposal | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const start = (kind: ProposalKind) => navigate(`/admin/proposals/${create(kind).id}`);

  const onDuplicate = (id: string) => {
    const copy = duplicate(id);
    if (copy) navigate(`/admin/proposals/${copy.id}`);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') || file.size > MAX_IMPORT_BYTES) {
      toast.error('Choose a .json export under 2 MB.');
      return;
    }
    const result = importJson(await file.text());
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    const skipped = result.skipped > 0 ? ` ${result.skipped} couldn’t be read.` : '';
    toast.success(`Imported ${result.proposals.length} proposal${result.proposals.length === 1 ? '' : 's'}.${skipped}`);
  };

  return (
    <AdminPage
      eyebrow="Partners"
      title="Proposals"
      description="Partner proposals you have prepared. Start from the template, tailor it to a brand, and come back to it here."
      actions={
        <>
          <CommandButton size="sm" onClick={() => start('tournament')}><FilePlus2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />Tournament partner</CommandButton>
          <CommandButton size="sm" onClick={() => start('platform')}><FilePlus2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />Platform partner</CommandButton>
        </>
      }
    >
      {!available && (
        <InlineNotice tone="warning">
          This browser is blocking storage, so proposals won’t be kept. Export a backup before you leave.
        </InlineNotice>
      )}
      {proposals.length === 0 ? (
        <CommandEmptyState
          title="No proposals yet"
          description="Start a tournament or platform proposal above. Each one is saved here as you edit, so you can reopen it, duplicate it for the next brand, or print it."
        />
      ) : (
        <ul className="border border-white/10 bg-[#0a0a0c]/92">
          {proposals.map((p) => (
            <ProposalRow key={p.id} proposal={p} onDuplicate={onDuplicate} onDelete={setPendingDelete} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-5">
        <CommandButton variant="secondary" size="sm" disabled={proposals.length === 0} onClick={() => downloadJson(exportJson())}>
          <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />Export backup
        </CommandButton>
        <CommandButton variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />Import backup
        </CommandButton>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import proposals from a JSON file"
          onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }}
        />
        <p className="text-xs text-zinc-500">Proposals live in this browser. Export to back them up or move them to another device.</p>
      </div>
      <DeleteProposalDialog
        proposal={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(p) => { remove(p.id); setPendingDelete(null); toast.success('Proposal deleted.'); }}
      />
    </AdminPage>
  );
}
