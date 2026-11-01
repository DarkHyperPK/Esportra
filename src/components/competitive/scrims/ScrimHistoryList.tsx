import { useState } from 'react';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { useScrimHistory } from '@/hooks/competitive/useScrims';
import { SCRIM_CARD_CLASS, SCRIM_EYEBROW } from './WorkspaceListingCard';
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-[104px] rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
      ))}
    </div>
  );
}

// ── HistoryCard ───────────────────────────────────────────────────────────────

function HistoryCard({ entry }: { entry: ScrimHistoryEntry }) {
  const catalog = useGameCatalogContext();
  const catalogGame = catalog.games.find((g) => g.slug === entry.gameSlug);

  const date = entry.scheduledAt
    ? new Date(entry.scheduledAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const score =
    entry.myScore != null && entry.opponentScore != null
      ? `${entry.myScore} – ${entry.opponentScore}`
      : '— – —';

  const opponentInitials = (entry.opponentTeamName ?? 'TM').slice(0, 2).toUpperCase();

  return (
    <div className={`${SCRIM_CARD_CLASS} p-3.5`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.1] bg-black/40 text-[10px] font-semibold text-white/60">
          {entry.opponentTeamLogo ? (
            <img src={entry.opponentTeamLogo} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            opponentInitials
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">
            {entry.opponentTeamName ?? 'Unknown'}
          </p>
          <p className={`${SCRIM_EYEBROW} mt-0.5 flex items-center gap-1.5`}>
            {entry.gameSlug && (
              <GameLogoImage
                gameName={entry.gameSlug}
                catalogLogo={catalogGame?.logo}
                className="h-3 w-3 object-contain"
              />
            )}
            <span className="truncate">
              {[date, catalogGame?.name ?? entry.gameSlug?.toUpperCase()]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </p>
        </div>

        <StatusPill label={RESULT_LABEL[entry.result]} tone={RESULT_TONE[entry.result]} />
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-white/[0.06] pt-2.5">
        <span className="font-mono text-[17px] font-semibold tabular-nums leading-none text-white/85">
          {score}
        </span>
        {entry.mapName && (
          <span className="truncate text-[11px] text-white/35">{entry.mapName}</span>
        )}
      </div>
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
 * Paginated scrim history — result cards (opponent crest, date, game, score).
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Scrim history">
        {items.map((entry) => (
          <div key={entry.sessionId} role="listitem">
            <HistoryCard entry={entry} />
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
