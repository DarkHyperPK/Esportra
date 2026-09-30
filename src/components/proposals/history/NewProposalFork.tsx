import { ArrowRight } from 'lucide-react';
import type { ProposalKind } from '@/schemas/proposal';

const OPTIONS: Array<{ kind: ProposalKind; title: string; body: string; facts: string }> = [
  {
    kind: 'tournament',
    title: 'Tournament partner',
    body: 'Priced packages for one event: posts, placements, stream branding and naming rights.',
    facts: 'One event · Priced packages',
  },
  {
    kind: 'platform',
    title: 'Platform partner',
    body: 'Year-round presence across Esportra, described by value. Terms agreed with each partner.',
    facts: 'Year-round · Quoted by value',
  },
];

interface NewProposalForkProps {
  onStart: (kind: ProposalKind) => void;
  /** Once proposals exist, the fork shrinks so the list leads. */
  compact?: boolean;
}

/** The fork: two kinds of proposal, each a real choice that says what it contains. */
export function NewProposalFork({ onStart, compact = false }: NewProposalForkProps) {
  return (
    <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-2">
      {OPTIONS.map((option) => (
        <button
          key={option.kind}
          type="button"
          onClick={() => onStart(option.kind)}
          className={`group flex flex-col bg-[#0a0a0c] text-left transition-colors hover:bg-[#111114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 ${compact ? 'p-5' : 'p-6 md:p-8'}`}
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">New proposal</span>
          <span className={`mt-3 flex items-center gap-3 font-heading font-black tracking-tight text-white ${compact ? 'text-xl' : 'text-2xl md:text-3xl'}`}>
            {option.title}
            <ArrowRight className="h-5 w-5 text-zinc-600 transition-all group-hover:translate-x-1 group-hover:text-white" aria-hidden />
          </span>
          {!compact && <span className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">{option.body}</span>}
          <span className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{option.facts}</span>
        </button>
      ))}
    </div>
  );
}
