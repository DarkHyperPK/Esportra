import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BRStageScheduleSection } from '@/components/organizer/br/BRStageScheduleSection';
import { apiClient } from '@/lib/apiClient';
import { utcToLocalInput } from '@/lib/timeUtils';
import type { BRGroup } from '@/types/brGroups';
import type { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/utils/brConfigResolve', () => ({
  getStageBRConfig: () => ({ format: 'static_groups', gamesPerLobby: 6, gameCount: 6 }),
}));

vi.mock('@/hooks/useBRGroups', () => ({
  useBRGroupsDetail: () => ({
    data: {
      groups: [{ id: 'g1', name: 'Group A', team_count: 2 }] as unknown as BRGroup[],
      has_rounds: true,
    },
    isLoading: false,
  }),
  useBRGroupsMutations: () => ({ generateLobbies: { mutate: vi.fn(), isPending: false } }),
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn() },
  getApiErrorMessage: (_error: unknown, options?: { context?: string }) => options?.context ?? 'mock error',
}));

const lobbyTimes: Record<string, string | null> = { l1: '2026-08-05T09:30:00.000Z' };
const gameTimes: Record<string, string | null> = { g1: '2026-08-05T09:35:00.000Z' };

const makeLobby = (scheduledAt: string | null) => ({
  id: 'l1',
  wave_number: 1,
  lobby_code: null,
  map: null,
  status: 'pending',
  scheduled_at: scheduledAt,
  started_at: null,
  completed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  result_count: 0,
  group_ids: ['g1'],
});

const renderSection = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const stage = { id: 'stage-1', stage_order: 1, name: 'Qualifiers' } as unknown as TournamentStage;
  return render(
    <QueryClientProvider client={client}>
      <BRStageScheduleSection
        stage={stage}
        tournamentId="t1"
        tournamentStartDate="2026-08-01T00:00:00.000Z"
        tournamentEndDate="2026-09-01T00:00:00.000Z"
        allStages={[stage]}
        registeredUnitCount={2}
        onUpdate={vi.fn()}
      />
    </QueryClientProvider>,
  );
};

describe('BRStageScheduleSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lobbyTimes.l1 = '2026-08-05T09:30:00.000Z';
    gameTimes.g1 = '2026-08-05T09:35:00.000Z';

    const get = apiClient.get as ReturnType<typeof vi.fn>;
    get.mockImplementation(async (path: string) => {
      if (path === '/api/stages/stage-1/br/lobbies') {
        return [makeLobby(lobbyTimes.l1)];
      }
      if (path === '/api/lobbies/l1/games') {
        return [
          {
            id: 'g1',
            lobby_id: 'l1',
            game_number: 1,
            map: null,
            status: 'pending',
            scheduled_at: gameTimes.g1,
            started_at: null,
            completed_at: null,
          },
        ];
      }
      return null;
    });

    const patch = apiClient.patch as ReturnType<typeof vi.fn>;
    patch.mockImplementation(async (path: string, body: { scheduledAt?: string | null }) => {
      if (path === '/api/br/lobbies/l1') {
        lobbyTimes.l1 = body.scheduledAt ?? null;
        return { id: 'l1' };
      }
      if (path === '/api/br/games/g1') {
        gameTimes.g1 = body.scheduledAt ?? null;
        return { id: 'g1' };
      }
      return {};
    });
  });

  it('seeds lobby and game times from the server', async () => {
    renderSection();

    expect(await screen.findByDisplayValue(utcToLocalInput(lobbyTimes.l1 ?? ''))).toBeInTheDocument();
    expect(screen.getByDisplayValue(utcToLocalInput(gameTimes.g1 ?? ''))).toBeInTheDocument();
    expect(screen.queryByText(/unsaved schedule changes/i)).not.toBeInTheDocument();
  });

  it('shows the unsaved-changes notice when a lobby time is edited', async () => {
    renderSection();

    const input = await screen.findByDisplayValue(utcToLocalInput(lobbyTimes.l1 ?? ''));
    fireEvent.change(input, { target: { value: '2026-08-05T15:30' } });

    expect(await screen.findByText(/unsaved schedule changes/i)).toBeInTheDocument();
  });

  it('clears the unsaved-changes notice after a lobby time is saved and persisted', async () => {
    renderSection();

    const input = await screen.findByDisplayValue(utcToLocalInput(lobbyTimes.l1 ?? ''));
    fireEvent.change(input, { target: { value: '2026-08-05T15:30' } });

    expect(await screen.findByText(/unsaved schedule changes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save lobby time/i }));

    await waitFor(() => {
      expect(screen.queryByText(/unsaved schedule changes/i)).not.toBeInTheDocument();
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/api/br/lobbies/l1', {
      scheduledAt: new Date('2026-08-05T15:30').toISOString(),
    });
    // Server truth is reflected back in the input after the refetch.
    expect(await screen.findByDisplayValue(utcToLocalInput(new Date('2026-08-05T15:30').toISOString()))).toBeInTheDocument();
  });

  it('clears the unsaved-changes notice after game times are saved', async () => {
    renderSection();

    const gameInput = await screen.findByDisplayValue(utcToLocalInput(gameTimes.g1 ?? ''));
    fireEvent.change(gameInput, { target: { value: '2026-08-05T16:00' } });

    expect(await screen.findByText(/unsaved schedule changes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save game times/i }));

    await waitFor(() => {
      expect(screen.queryByText(/unsaved schedule changes/i)).not.toBeInTheDocument();
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/api/br/games/g1', {
      scheduledAt: new Date('2026-08-05T16:00').toISOString(),
    });
  });
});
