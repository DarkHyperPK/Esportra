import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { CommandButton, CommandIconButton } from '@/components/management/CommandSurface';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import type { Proposal } from '@/schemas/proposal';
import { kindLabel } from '@/services/proposals/format';

interface ProposalRowProps {
  proposal: Proposal;
  onDuplicate: (id: string) => void;
  onDelete: (proposal: Proposal) => void;
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ProposalRow({ proposal, onDuplicate, onDelete }: ProposalRowProps) {
  const brand = proposal.prospect.brandName.trim();
  return (
    <li className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/admin/proposals/${proposal.id}`} className="font-heading text-lg font-bold tracking-tight text-white hover:underline">
            {brand || 'No brand yet'}
          </Link>
          <StatusPill label={kindLabel(proposal.kind)} tone="neutral" />
        </div>
        <p className="mt-1 truncate text-[13px] text-zinc-500">
          {proposal.title} · Edited <span className="tabular-nums">{formatUpdated(proposal.updatedAt)}</span>
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <CommandButton asChild variant="secondary" size="icon" aria-label={`Edit ${brand || proposal.title}`} title="Edit">
          <Link to={`/admin/proposals/${proposal.id}`}><Pencil className="h-4 w-4" aria-hidden /></Link>
        </CommandButton>
        <CommandButton asChild variant="secondary" size="icon" aria-label={`View and print ${brand || proposal.title}`} title="View and print">
          <Link to={`/admin/proposals/${proposal.id}/view`}><ExternalLink className="h-4 w-4" aria-hidden /></Link>
        </CommandButton>
        <CommandIconButton variant="secondary" label={`Duplicate ${brand || proposal.title}`} onClick={() => onDuplicate(proposal.id)}>
          <Copy />
        </CommandIconButton>
        <CommandIconButton variant="danger" label={`Delete ${brand || proposal.title}`} onClick={() => onDelete(proposal)}>
          <Trash2 />
        </CommandIconButton>
      </div>
    </li>
  );
}
