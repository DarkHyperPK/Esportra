import { useState } from 'react';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useScrimHistory } from '@/hooks/competitive/useScrims';
import type { ScrimHistoryEntry, ScrimHistoryResult } from '@/types/competitive';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const RESULT_TONE: Record<ScrimHistoryResult, 'success' | 'critical' | 'neutral'> = {
  win: 'success',
  loss: 'critical',
  draw: 'neutral',
};

const RESULT_LABEL: Record<ScrimHistoryResult, string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-1 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 bg-white/[0.04] border border-white/[0.06]" />
      ))}
    </div>
  );
}

// ── HistoryRow ────────────────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: ScrimHistoryEntry }) {
  const date = entry.scheduledAt
    ? new Date(entry.scheduledAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const score =
    entry.myScore != null && entry.opponentScore != null
      ? `${entry.myScore} – ${entry.opponentScore}`
      : '— – —';

  return (
    <div className="flex items-center gap-3 border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[13px]">
      {/* Opponent */}
      <span className="flex-1 min-w-0 font-medium text-white truncate">
        {entry.opponentTeamName ?? 'Unknown'}
      </span>

      {/* Date */}
      {date && (
        <span className="shrink-0 text-[12px] text-white/35 hidden sm:block">{date}</span>
      )}

      {/* Game slug badge */}
      {entry.gameSlug && (
        <span className="shrink-0 font-mono text-[10px] tracking-[0.18em] text-white/30 hidden md:block">
          {entry.gameSlug.toUpperCase().slice(0, 3)}
        </span>
      )}

      {/* Map name */}
      {entry.mapName && (
        <span className="shrink-0 text-[12px] text-white/40 hidden lg:block truncate max-w-[100px]">
          {entry.mapName}
        </span>
      )}

      {/* Score */}
      <span className="shrink-0 font-mono text-[13px] tabular-nums text-white/70">{score}</span>

      {/* Result badge */}
      <StatusPill
        label={RESULT_LABEL[entry.result]}
        tone={RESULT_TONE[entry.result]}
      />
    </div>
  );
}

// ── ScrimHistoryList ──────────────────────────────────────────────────────────

interface Props {
  teamId: string;
  /**
   * When true, a fetch error silently hides the component (for public
   * team profile pages where private history should not appear).
   */
  silentOnError?: boolean;
}

/**
 * Paginated scrim history list. Shows opponent, date, game, score and result.
 *
 * Usage:
 * - In workspace: `<ScrimHistoryList teamId={teamId} />`
 * - On team profile (public): `<ScrimHistoryList teamId={teamId} silentOnError />`
 */
export function ScrimHistoryList({ teamId, silentOnError = false }: Props) {
  const [page, setPage] = useState(1);
  const query = useScrimHistory(teamId, page, PAGE_SIZE);

  if (query.isLoading) return <HistorySkeleton />;

  if (query.isError) {
    if (silentOnError) return null;
    return (
      <div className="space-y-3">
        <InlineNotice tone="critical">Could not load scrim history.</InlineNotice>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
        >
          Retry
        </Button>
      </div>
    );
  }

  const { items = [], total = 0, isPublic } = query.data ?? { items: [], total: 0, isPublic: true };

  // On a public profile page, hide private history from non-members.
  if (silentOnError && !isPublic) return null;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (items.length === 0) {
    return (
      <p className="text-[14px] text-white/40 py-4">No completed scrims yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1" role="list" aria-label="Scrim history">
        {items.map((entry) => (
          <div key={entry.sessionId} role="listitem">
            <HistoryRow entry={entry} />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-none text-[12px] text-white/55 hover:text-white"
          >
            Prev
          </Button>
          <span className="text-[12px] text-white/30 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-none text-[12px] text-white/55 hover:text-white"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
