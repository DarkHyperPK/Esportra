/**
 * UpNextList
 *
 * Every action the team owes, as compact rows (check-in, veto, results,
 * dispute evidence). Offers are rendered as full cards elsewhere.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { describeUpNext } from '@/services/scrimUpNext';
import type { ScrimUpNextItem } from '@/types/competitive';

interface UpNextListProps {
  items: ScrimUpNextItem[];
}

export function UpNextList({ items }: UpNextListProps) {
  if (items.length === 0) return null;
  const now = Date.now();

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const view = describeUpNext(item, now);
        return (
          <li
            key={`${item.type}-${item.sessionId ?? item.offerId}`}
            className={cn(
              'relative flex flex-col gap-3 rounded-xl border bg-white/[0.03] p-3.5 sm:flex-row sm:items-center',
              view.urgent ? 'border-white/[0.16]' : 'border-white/[0.08]',
            )}
          >
                        <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[14px] font-semibold text-white">{view.title}</p>
              <p className="text-[12px] leading-snug text-zinc-400">{view.detail}</p>
            </div>
            <Link
              to={view.href}
              className={cn(
                'inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 px-4 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]',
                view.urgent
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'border border-white/[0.14] text-white/80 hover:border-white/30 hover:text-white',
              )}
            >
              {view.cta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
