import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttentionItem } from '@/services/tournamentDashboard/attention';
import { EYEBROW_CLASS, PANEL_CLASS, TONE_DOT } from '../tone';

interface AttentionListProps {
  items: AttentionItem[];
  onOpen: (item: AttentionItem) => void;
}

const TONE_LABEL: Record<AttentionItem['tone'], string> = {
  critical: 'Blocking',
  warning: 'Needs action',
  info: 'Heads up',
};

export function AttentionList({ items, onOpen }: AttentionListProps) {
  return (
    <section aria-labelledby="attention-heading" className={cn(PANEL_CLASS, 'flex flex-col')}>
      <header className="flex items-baseline justify-between border-b border-white/[0.06] px-5 py-4">
        <h2 id="attention-heading" className="font-heading text-lg font-bold text-white">Needs you</h2>
        <span className={EYEBROW_CLASS}>{items.length === 0 ? 'All clear' : `${items.length} open`}</span>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center gap-3 px-5 py-8 text-sm text-zinc-400">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
          Nothing is waiting on you. New approvals, payments and disputes show up here.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.04] focus-visible:outline-none"
              >
                <span aria-hidden className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[item.tone === 'info' ? 'neutral' : item.tone])} />
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{TONE_LABEL[item.tone]}: </span>
                  <span className="block font-medium text-white">{item.title}</span>
                  <span className="mt-0.5 block text-sm text-zinc-500">{item.detail}</span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="mt-1 h-4 w-4 shrink-0 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-rose-400"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
