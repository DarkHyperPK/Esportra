import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPage } from '@/components/admin/AdminPage';
import { CommandButton, CommandSegmentedButton } from '@/components/management/CommandSurface';
import { DeleteProposalDialog } from '@/components/proposals/history/DeleteProposalDialog';
import { NewProposalFork } from '@/components/proposals/history/NewProposalFork';
import { ProposalRow } from '@/components/proposals/history/ProposalRow';
import { Input } from '@/components/ui/input';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { CONTROL_CLASS } from '@/components/ui/kit/tone';
import { useProposalHistory } from '@/hooks/useProposalHistory';
import type { Proposal, ProposalKind } from '@/schemas/proposal';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

type Filter = 'all' | ProposalKind;
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'platform', label: 'Platform' },
];

function matches(p: Proposal, filter: Filter, query: string): boolean {
  if (filter !== 'all' && p.kind !== filter) return false;
  const q = query.trim().toLowerCase();
  return !q || [p.prospect.brandName, p.prospect.industry, p.title].some((v) => v.toLowerCase().includes(q));
}

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
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => proposals.filter((p) => matches(p, filter, query)), [proposals, filter, query]);

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
      description="Start from the template, tailor it to a brand, and come back to it here."
    >
      {!available && (
        <InlineNotice tone="warning">
          This browser is blocking storage, so proposals won’t be kept. Export a backup before you leave.
        </InlineNotice>
      )}
      <NewProposalFork onStart={start} compact={proposals.length > 0} />
      {proposals.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No proposals yet. Each one you start is saved here as you edit, so you can reopen it, duplicate it for the next brand, or print it.
        </p>
      ) : (
        <section aria-label="Saved proposals" className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5" role="group" aria-label="Filter by type">
              {FILTERS.map((f) => (
                <CommandSegmentedButton key={f.id} aria-pressed={filter === f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                </CommandSegmentedButton>
              ))}
            </div>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by brand"
                aria-label="Search proposals by brand"
                className={`${CONTROL_CLASS} h-9 pl-9 text-sm`}
              />
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
              No proposals match. Clear the search or pick another type.
            </p>
          ) : (
            <ul className="border border-white/10 bg-[#0a0a0c]/92">
              {shown.map((p) => (
                <ProposalRow key={p.id} proposal={p} onDuplicate={onDuplicate} onDelete={setPendingDelete} />
              ))}
            </ul>
          )}
        </section>
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
