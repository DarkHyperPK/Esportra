import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTournamentTemplates } from './useTournamentTemplates';
import type { TournamentTemplateDto } from '@/types/tournamentTemplate';

const get = vi.hoisted(() => vi.fn());

vi.mock('@/lib/apiClient', () => ({
  apiClient: { get },
  getApiErrorMessage: (_error: unknown, options?: { context?: string }) =>
    options?.context ?? 'mock error',
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockTemplates: TournamentTemplateDto[] = [
  {
    id: 'tpl-1',
    gameCatalogId: 'gc-1',
    slug: 'valorant-standard',
    rulesText: 'Standard Valorant rules.',
    rulesSourceUrl: null,
    rulesUpdatedAt: '2026-01-01T00:00:00Z',
    defaultBestOf: 3,
    defaultMaxTeams: 16,
    recommendedTeamCounts: [8, 16],
    isPublisherEndorsed: false,
    isActive: true,
    rulesStale: false,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
    gameName: 'Valorant',
    gameSlug: 'valorant',
    gameType: 'bracket',
    defaultModeKey: 'standard',
    bannerUrl: null,
    logoUrl: null,
    iconUrl: null,
  },
];

describe('useTournamentTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useTournamentTemplates_ReturnsTemplates_OnSuccess', async () => {
    get.mockResolvedValue(mockTemplates);

    const { result } = renderHook(() => useTournamentTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTemplates);
    expect(get).toHaveBeenCalledWith('/api/tournament-templates');
  });

  it('useTournamentTemplates_ReturnsError_OnFetchFailure', async () => {
    get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTournamentTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('useTournamentTemplates_IsLoading_Initially', () => {
    // Promise that never resolves keeps the hook in pending state indefinitely
    get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTournamentTemplates(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});
