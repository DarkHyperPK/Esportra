import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { MatchHistoryEntryDto } from '@/types/profile';
import { MatchHistoryItem } from '@/components/profile/history/MatchHistoryItem';
import { Swords } from 'lucide-react';

interface MatchHistoryTabProps {
  profileId: string;
  accentColor: string;
}

export function MatchHistoryTab({ profileId, accentColor }: MatchHistoryTabProps): React.JSX.Element {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['match-history', profileId, page],
    queryFn: () =>
      apiClient.get<{ items: MatchHistoryEntryDto[]; total: number; pageSize: number }>(
        `/api/profiles/${profileId}/match-history?page=${page}`
      ),
    enabled: !!profileId,
    staleTime: 60_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = total > page * (data?.pageSize ?? 20);
  const hasPrev = page > 1;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ height: 56, background: 'rgba(255,255,255,0.03)', borderRadius: 6, marginBottom: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0', color: 'rgba(255,255,255,0.25)' }}>
        <Swords size={28} strokeWidth={1.5} />
        <p style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', margin: 0 }}>No completed matches yet</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        {items.map((entry, i) => (
          <MatchHistoryItem key={entry.match_id} entry={entry} accentColor={accentColor} index={i} />
        ))}
      </div>

      {(hasPrev || hasMore) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 }}>
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => setPage(p => p - 1)}
            style={{
              fontSize: 12, color: hasPrev ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
              background: 'none', border: 'none', cursor: hasPrev ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif', padding: 0,
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
            {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </span>
          <button
            type="button"
            disabled={!hasMore}
            onClick={() => setPage(p => p + 1)}
            style={{
              fontSize: 12, color: hasMore ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
              background: 'none', border: 'none', cursor: hasMore ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif', padding: 0,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
