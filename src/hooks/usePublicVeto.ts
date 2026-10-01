import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { mapApiVetoToLocal } from '@/hooks/useMapVetoMachine';
import { normalizeHistoryEntry, type VetoHistoryEntry } from '@/hooks/useVetoHistory';

const BRACKET_ID_PREFIX = /^(db-|wb-|lb-|source-)/;

function toRawMatchId(matchId: string) {
    return matchId.replace(BRACKET_ID_PREFIX, '');
}

/** Read-only veto state for spectators (public bracket match details). */
export function usePublicVeto(matchId: string, enabled: boolean) {
    const rawId = toRawMatchId(matchId);
    return useQuery({
        queryKey: ['public-veto', rawId],
        queryFn: async () => {
            try {
                const data = await apiClient.get<Record<string, unknown>>(`/api/public/veto/${rawId}`);
                return mapApiVetoToLocal(data);
            } catch {
                return null;
            }
        },
        enabled: enabled && Boolean(rawId),
        staleTime: 30_000,
    });
}

/** Recorded veto steps, oldest first. */
export function usePublicVetoHistory(matchId: string, enabled: boolean) {
    const rawId = toRawMatchId(matchId);
    return useQuery({
        queryKey: ['public-veto-history', rawId],
        queryFn: async (): Promise<VetoHistoryEntry[]> => {
            try {
                const data = await apiClient.get<unknown>(`/api/public/veto/${rawId}/history`);
                const rows = Array.isArray(data) ? data : [];
                return rows
                    .map((row) => normalizeHistoryEntry(row as Record<string, unknown>))
                    .sort((a, b) => a.actionNumber - b.actionNumber);
            } catch {
                return [];
            }
        },
        enabled: enabled && Boolean(rawId),
        staleTime: 30_000,
    });
}
