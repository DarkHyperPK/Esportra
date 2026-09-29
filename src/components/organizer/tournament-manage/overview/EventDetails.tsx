import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS, PANEL_CLASS } from '@/components/ui/kit/tone';

export interface EventDetailRow {
  label: string;
  value: string;
}

interface EventDetailsProps {
  description?: string | null;
  rows: EventDetailRow[];
}

const LONG_DESCRIPTION = 220;

export function EventDetails({ description, rows }: EventDetailsProps) {
  const [expanded, setExpanded] = useState(false);
  const text = description?.trim() ?? '';
  const isLong = text.length > LONG_DESCRIPTION;

  return (
    <section aria-labelledby="details-heading" className={cn(PANEL_CLASS, 'px-5 py-4')}>
      <h2 id="details-heading" className="font-heading text-lg font-bold text-white">Event details</h2>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className={EYEBROW_CLASS}>{row.label}</dt>
            <dd className="mt-1 truncate text-sm text-zinc-200" title={row.value}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className={EYEBROW_CLASS}>About</p>
        {text ? (
          <>
            <p className={cn('mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-400', !expanded && isLong && 'line-clamp-4')}>
              {text}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="mt-2 text-xs font-semibold text-rose-300 hover:text-rose-200"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">No description yet. Add one from Edit details.</p>
        )}
      </div>
    </section>
  );
}
