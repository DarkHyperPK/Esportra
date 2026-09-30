import { forwardRef } from 'react';
import { CommandSegmentedButton } from '@/components/management/CommandSurface';
import { ProposalDocument } from '@/components/proposals/document/ProposalDocument';
import { PLATFORM_PAGES } from '@/components/proposals/document/PlatformProposalDocument';
import { TOURNAMENT_PAGES } from '@/components/proposals/document/TournamentProposalDocument';
import type { Proposal } from '@/schemas/proposal';

interface PreviewPaneProps {
  doc: Proposal;
  onTheme: (theme: Proposal['theme']) => void;
}

/** Live preview with its own toolbar. The ref is the scroll container, so the editor can jump to a page. */
export const PreviewPane = forwardRef<HTMLDivElement, PreviewPaneProps>(({ doc, onTheme }, ref) => (
  <div className="border border-white/10 bg-[#0a0a0c]">
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
        Preview · {doc.kind === 'tournament' ? TOURNAMENT_PAGES : PLATFORM_PAGES} pages · A4
      </span>
      <div className="flex gap-1.5" role="group" aria-label="Ground">
        <CommandSegmentedButton aria-pressed={doc.theme === 'stage'} active={doc.theme === 'stage'} onClick={() => onTheme('stage')}>Stage</CommandSegmentedButton>
        <CommandSegmentedButton aria-pressed={doc.theme === 'paper'} active={doc.theme === 'paper'} onClick={() => onTheme('paper')}>Paper</CommandSegmentedButton>
      </div>
    </div>
    <div ref={ref} className="max-h-[calc(100vh-9.5rem)] overflow-y-auto">
      <ProposalDocument doc={doc} />
    </div>
  </div>
));

PreviewPane.displayName = 'PreviewPane';
