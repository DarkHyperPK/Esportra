import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ReadinessIssue } from '@/services/proposals/readiness';

interface ReadinessPanelProps {
  issues: ReadinessIssue[];
  onJump: (sectionId: string) => void;
}

/** "Before you send": what's still missing, each line opening the section that fixes it. */
export function ReadinessPanel({ issues, onJump }: ReadinessPanelProps) {
  if (issues.length === 0) {
    return (
      <p className="flex items-center gap-2 border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-[13px] text-emerald-100">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
        Ready to send. Nothing is missing.
      </p>
    );
  }
  return (
    <section aria-labelledby="readiness-title" className="border border-amber-500/25 bg-amber-950/10">
      <h2 id="readiness-title" className="border-b border-amber-500/15 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200">
        Before you send · {issues.length}
      </h2>
      <ul>
        {issues.map((issue, i) => (
          <li key={`${issue.sectionId}-${i}`} className="border-b border-white/[0.05] last:border-b-0">
            <button
              type="button"
              onClick={() => onJump(issue.sectionId)}
              className="group flex w-full items-start gap-3 px-4 py-2.5 text-left text-[13px] leading-snug text-zinc-300 transition-colors hover:bg-white/[0.03] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
            >
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span className="flex-1">{issue.message}</span>
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
