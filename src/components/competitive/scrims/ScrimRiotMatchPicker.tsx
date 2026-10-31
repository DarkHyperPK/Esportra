import { formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCcw, Search } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
import { useScrimRecentMatches } from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ScrimRecentMatch } from '@/types/competitive';

// ── Shared style constants (aligned to ScrimSessionPage) ─────────────────────

const GHOST =
  'text-[13px] border border-white/[0.08] text-white/55 hover:text-white rounded-none px-4 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

const EYEBROW = 'font-mono text-[10px] tracking-[0.28em] text-zinc-500 uppercase';

// ── Match row ─────────────────────────────────────────────────────────────────

function MatchRow({
  match,
  onSelect,
}: {
  match: ScrimRecentMatch;
  onSelect: (m: ScrimRecentMatch) => void;
}) {
  const ago = formatDistanceToNow(match.startTime) + ' ago';
  const resultColor =
    match.result === 'win'
      ? 'text-emerald-400'
      : match.result === 'loss'
        ? 'text-rose-400'
        : 'text-zinc-400';
  const resultLabel = match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D';

  return (
    <button
      type="button"
      onClick={() => onSelect(match)}
      className="w-full flex items-center gap-3 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {/* Result badge */}
      <span
        className={`font-mono text-[11px] font-bold w-5 shrink-0 text-center ${resultColor}`}
        aria-label={match.result}
      >
        {resultLabel}
      </span>

      {/* Map name */}
      <span className="flex-1 min-w-0 text-[13px] font-medium text-white truncate">
        {match.map}
      </span>

      {/* Score */}
      <span className="font-mono text-[13px] tabular-nums text-white/70 shrink-0">
        {match.team1Score}
        <span className="text-white/30 mx-1">–</span>
        {match.team2Score}
      </span>

      {/* Time */}
      <span className="text-[11px] text-white/30 shrink-0 hidden sm:block">{ago}</span>

      {/* Select cue */}
      <span className="text-[11px] text-white/25 shrink-0">Use</span>
    </button>
  );
}

// ── ScrimRiotMatchPicker ──────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  isValorant: boolean;
  onFill: (team1Score: number, team2Score: number) => void;
}

/**
 * Inline Riot match picker for the scrim result form.
 * Only rendered for Valorant sessions. Fetches recent matches on demand,
 * lets the user pick one, and calls onFill with the oriented scores.
 */
export function ScrimRiotMatchPicker({ sessionId, isValorant, onFill }: Props) {
  const { data, isFetching, isError, error, refetch } = useScrimRecentMatches(sessionId);
  const matches = data ?? null;

  if (!isValorant) return null;

  const handleSelect = (match: ScrimRecentMatch) => {
    onFill(match.team1Score, match.team2Score);
  };

  return (
    <div className="space-y-2">
      <p className={EYEBROW}>Fetch from Riot</p>

      <button
        type="button"
        onClick={() => void refetch()}
        disabled={isFetching}
        className={`${GHOST} flex items-center gap-2`}
        aria-busy={isFetching}
      >
        {isFetching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : matches !== null ? (
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Search className="h-3.5 w-3.5" aria-hidden />
        )}
        {isFetching
          ? 'Fetching…'
          : matches !== null
            ? 'Refetch'
            : 'Fetch recent matches'}
      </button>

      {isError && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(error, 'Could not fetch recent matches.')}
        </InlineNotice>
      )}

      {matches !== null && !isError && (
        <>
          {matches.length === 0 ? (
            <p className="text-[13px] text-white/40">No recent matches found.</p>
          ) : (
            <div className="space-y-1" role="list" aria-label="Recent Valorant matches">
              {matches.map((m) => (
                <div key={m.id} role="listitem">
                  <MatchRow match={m} onSelect={handleSelect} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
