import { Link } from 'react-router-dom';
import { Crosshair } from 'lucide-react';

interface DiscoveryEmptyProps {
  kind: 'none' | 'filtered' | 'error';
  gameName: string;
  onClearFilters?: () => void;
  onRetry?: () => void;
}

const ACTION =
  'inline-flex min-h-[44px] items-center justify-center px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]';

/** The three ways the list can have nothing to show, each with the next step. */
export function DiscoveryEmpty({ kind, gameName, onClearFilters, onRetry }: DiscoveryEmptyProps) {
  const copy = {
    none: {
      title: `Nobody is looking for ${gameName} scrims yet`,
      body: 'Post your availability and teams will find you.',
    },
    filtered: {
      title: 'No teams match these filters',
      body: 'Try a wider rank range or another region.',
    },
    error: {
      title: 'Could not load listings',
      body: 'Check your connection and try again.',
    },
  }[kind];

  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-white/[0.12] px-6 py-14 text-center">
      <Crosshair className="h-7 w-7 text-white/25" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-heading text-[18px] font-bold text-white">{copy.title}</p>
        <p className="mx-auto max-w-sm text-[13px] text-zinc-400">{copy.body}</p>
      </div>
      {kind === 'none' && (
        <Link to="/competitive/scrims/workspace" className={`${ACTION} bg-white text-black hover:bg-rose-500 hover:text-white`}>
          Post a listing
        </Link>
      )}
      {kind === 'filtered' && onClearFilters && (
        <button type="button" onClick={onClearFilters} className={`${ACTION} border border-white/[0.14] text-white/80 hover:text-white`}>
          Clear filters
        </button>
      )}
      {kind === 'error' && onRetry && (
        <button type="button" onClick={onRetry} className={`${ACTION} border border-white/[0.14] text-white/80 hover:text-white`}>
          Retry
        </button>
      )}
    </div>
  );
}
