import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandButton } from '@/components/management/CommandSurface';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';

export interface ConflictCardProps {
  /** Match code, e.g. "MAIN". May be null if the event does not carry it. */
  matchCode: string | null;
  mapNumber: number;
  submittedA: number;
  submittedB: number;
  gepA: number;
  gepB: number;
  isResolving: boolean;
  /** Set when the resolution API call failed. */
  resolveError?: string | null;
  /** Set when the conflict has been resolved successfully. */
  resolved?: boolean;
  onUseGep: () => void;
  onKeepSubmitted: () => void;
}

/**
 * T35 Conflict card — appears above the rundown when a ResultConflict SignalR
 * event arrives. Operator must choose between submitted and GEP scores.
 * No dismiss without a choice.
 */
export function ConflictCard({
  matchCode,
  mapNumber,
  submittedA,
  submittedB,
  gepA,
  gepB,
  isResolving,
  resolveError,
  resolved,
  onUseGep,
  onKeepSubmitted,
}: ConflictCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Move focus to the card when it appears so screen readers announce it.
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  const aMatch = submittedA === gepA;
  const bMatch = submittedB === gepB;

  const mapLabel = matchCode ? `Map ${mapNumber} · ${matchCode}` : `Map ${mapNumber}`;

  return (
    <motion.div
      ref={wrapperRef}
      role="alert"
      aria-busy={isResolving}
      tabIndex={-1}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="mx-4 mt-3 border border-amber-400/30 bg-amber-400/10 px-4 py-4 outline-none"
    >
      {/* Card header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300">
            Result Conflict
          </span>
        </div>
        <span className="font-mono text-[11px] text-zinc-400">{mapLabel}</span>
      </div>

      {/* Score comparison grid */}
      <div className="mb-3 grid grid-cols-2 gap-4 border border-white/[0.07] bg-black/20 p-3">
        {/* Submitted column */}
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Submitted
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'font-mono text-2xl font-black',
                aMatch ? 'text-zinc-400' : 'text-amber-300',
              )}
              aria-label={
                aMatch
                  ? undefined
                  : `Submitted score for Team A: ${submittedA} (differs from GEP score of ${gepA})`
              }
            >
              {submittedA}
            </span>
            <span className="font-mono text-xl text-zinc-500">–</span>
            <span
              className={cn(
                'font-mono text-2xl font-black',
                bMatch ? 'text-zinc-400' : 'text-amber-300',
              )}
              aria-label={
                bMatch
                  ? undefined
                  : `Submitted score for Team B: ${submittedB} (differs from GEP score of ${gepB})`
              }
            >
              {submittedB}
            </span>
          </div>
        </div>

        {/* GEP column */}
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            GEP
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'font-mono text-2xl font-black',
                aMatch ? 'text-zinc-400' : 'text-amber-300',
              )}
              aria-label={
                aMatch
                  ? undefined
                  : `GEP score for Team A: ${gepA} (differs from submitted score of ${submittedA})`
              }
            >
              {gepA}
            </span>
            <span className="font-mono text-xl text-zinc-500">–</span>
            <span
              className={cn(
                'font-mono text-2xl font-black',
                bMatch ? 'text-zinc-400' : 'text-amber-300',
              )}
              aria-label={
                bMatch
                  ? undefined
                  : `GEP score for Team B: ${gepB} (differs from submitted score of ${gepB})`
              }
            >
              {gepB}
            </span>
          </div>
        </div>
      </div>

      {/* Error notice */}
      {resolveError && (
        <InlineNotice tone="critical" className="mb-3">
          {resolveError}
        </InlineNotice>
      )}

      {/* Resolved notice */}
      {resolved && (
        <InlineNotice tone="success" className="mb-3">
          Score confirmed.
        </InlineNotice>
      )}

      {/* Body copy */}
      {!resolved && (
        <p className="mb-4 text-[13px] text-zinc-400">
          Submitted score and GEP reading differ. Choose which score to keep.
        </p>
      )}

      {/* Action buttons */}
      {!resolved && (
        <div className="flex items-center justify-end gap-2">
          <CommandButton
            variant="ghost"
            size="sm"
            onClick={onKeepSubmitted}
            disabled={isResolving}
          >
            Keep submitted
          </CommandButton>
          <CommandButton
            variant="primary"
            slide
            size="sm"
            onClick={onUseGep}
            disabled={isResolving}
          >
            {isResolving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Resolving" />
            ) : (
              'Use GEP score'
            )}
          </CommandButton>
        </div>
      )}
    </motion.div>
  );
}
