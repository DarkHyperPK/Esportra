import { apiClient } from '@/lib/apiClient';

export type BulkTournamentLifecycleAction = 'soft-delete' | 'restore' | 'permanent-delete';

const CHUNK_SIZE = 200;

type BulkLifecycleResponse = {
  success: boolean;
  affected: number;
  action: string;
};

export async function runBulkTournamentLifecycle(
  organizationId: string,
  tournamentIds: string[],
  action: BulkTournamentLifecycleAction,
  onProgress?: (completed: number, total: number) => void,
): Promise<number> {
  if (tournamentIds.length === 0) return 0;

  const deletedAt = new Date().toISOString();
  let totalAffected = 0;

  for (let offset = 0; offset < tournamentIds.length; offset += CHUNK_SIZE) {
    const chunk = tournamentIds.slice(offset, offset + CHUNK_SIZE);
    const result = await apiClient.post<BulkLifecycleResponse>(
      `/api/organizations/${organizationId}/tournaments/bulk-lifecycle`,
      {
        tournamentIds: chunk,
        action,
        ...(action === 'soft-delete' ? { deletedAt } : {}),
      },
    );
    totalAffected += result.affected ?? 0;
    onProgress?.(Math.min(offset + chunk.length, tournamentIds.length), tournamentIds.length);
  }

  return totalAffected;
}

/** Skip RAWG/IGDB carousel work when the grid is large enough to hurt perf. */
export const ORGANIZER_TOURNAMENT_LITE_THRESHOLD = 100;
