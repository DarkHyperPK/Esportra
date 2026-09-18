import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import type { TournamentHistoryEntryDto } from '@/types/profile';
import { TournamentTimelineItem } from '@/components/profile/history/TournamentTimelineItem';

interface TournamentHistoryTabProps {
  profileId: string;
  accentColor: string;
}

/**
 * TournamentHistoryTab: game filter chips + paginated timeline list.
 * Load more button. Game filter updates the API query.
 */
export function TournamentHistoryTab({ profileId, accentColor }: TournamentHistoryTabProps): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [allItems, setAllItems] = useState<TournamentHistoryEntryDto[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['tournament-history', profileId, page, gameFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (gameFilter !== 'all') params.set('game', gameFilter);
      return apiClient.get<{
        items: TournamentHistoryEntryDto[];
        total: number;
        has_more: boolean;
      }>(`/api/profiles/${profileId}/tournament-history?${params}`);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Merge new page items
  React.useEffect(() => {
    if (data?.items) {
      if (page === 1) {
        setAllItems(data.items);
      } else {
        setAllItems((prev) => [...prev, ...data.items]);
      }
    }
  }, [data, page]);

  // Reset on filter change
  const handleFilterChange = (game: string) => {
    setGameFilter(game);
    setPage(1);
    setAllItems([]);
  };

  // Derive unique games from loaded items
  const games = React.useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((e) => { if (e.game) set.add(e.game); });
    return Array.from(set);
  }, [allItems]);

  const hasMore = data?.has_more ?? false;
  const showLoadMore = hasMore && !isLoading;

  const chipBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    border: '1px solid',
    background: 'none',
    fontFamily: 'Inter, sans-serif',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div>
      {/* Game filter chips */}
      {games.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            marginBottom: 20,
            paddingBottom: 4,
          }}
        >
          <button
            type="button"
            style={{
              ...chipBase,
              background: gameFilter === 'all' ? `rgba(${hexToRgb(accentColor)}, 0.2)` : 'rgba(255,255,255,0.04)',
              borderColor: gameFilter === 'all' ? accentColor : 'rgba(255,255,255,0.1)',
              color: gameFilter === 'all' ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            }}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          {games.map((game) => (
            <button
              key={game}
              type="button"
              style={{
                ...chipBase,
                background: gameFilter === game ? `rgba(${hexToRgb(accentColor)}, 0.2)` : 'rgba(255,255,255,0.04)',
                borderColor: gameFilter === game ? accentColor : 'rgba(255,255,255,0.1)',
                color: gameFilter === game ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
              }}
              onClick={() => handleFilterChange(game)}
            >
              {game}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {isLoading && page === 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Loader2 size={24} color="rgba(255,255,255,0.4)" className="animate-spin" />
        </div>
      ) : (
        <div
          style={{
            borderLeft: `2px solid ${accentColor}`,
            paddingLeft: 20,
            marginLeft: 8,
          }}
        >
          {allItems.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: '8px 0' }}>
              No tournament history yet
            </div>
          ) : (
            allItems.map((entry, i) => (
              <TournamentTimelineItem
                key={`${entry.tournament_id}-${i}`}
                entry={entry}
                accentColor={accentColor}
                abbreviated={false}
                index={i % 20}
              />
            ))
          )}
        </div>
      )}

      {/* Load more */}
      {showLoadMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => setPage((p) => p + 1)}
            style={{
              height: 44,
              minWidth: 120,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              cursor: isFetching ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'Inter, sans-serif',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isFetching ? (
              <Loader2 size={16} className="animate-spin" color="rgba(255,255,255,0.5)" />
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '123, 97, 255';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
