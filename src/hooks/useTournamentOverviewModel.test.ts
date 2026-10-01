import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DashboardStage, DashboardTournament } from '@/hooks/useTournamentDashboard';
import { deriveFormatLabel, useTournamentOverviewModel } from '@/hooks/useTournamentOverviewModel';
import type { CompletionSummary } from '@/hooks/useCompletionState';

vi.mock('@/hooks/useNow', () => ({ useNow: () => new Date('2026-06-01T09:00:00Z').getTime() }));
vi.mock('@/hooks/useTournamentInvitations', () => ({
  useTournamentInvitations: () => ({ invitations: { data: null } }),
}));

function makeStage(format: string, stage_order: number): DashboardStage {
  return {
    id: `s-${stage_order}`,
    tournament_id: 't-1',
    name: `Stage ${stage_order}`,
    format,
    stage_order,
    status: 'draft',
    config: {},
    capacity: 0,
    advancement_count: 0,
    best_of: 1,
    bo_mode: 'per_stage',
    round_bo_overrides: null,
    is_locked: false,
    progress_label: null,
    starts_at: null,
    ends_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function makeTournament(format: DashboardTournament['format'] = 'single_elimination'): DashboardTournament {
  return {
    id: 't-1',
    name: 'Test',
    description: '',
    slug: 'test',
    game: 'valorant',
    max_teams: 16,
    min_teams: 4,
    entry_fee: '0',
    prize_pool: '0',
    start_date: '2026-06-01T10:00:00Z',
    end_date: '2026-06-01T18:00:00Z',
    registration_deadline: '2026-05-31T10:00:00Z',
    status: 'draft',
    organizer_id: 'u-1',
    venue_id: null,
    is_public: true,
    banner_url: null,
    logo_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    check_in_required: false,
    check_in_deadline: null,
    auto_remove_unchecked: false,
    team_size: 5,
    format,
  };
}

describe('deriveFormatLabel', () => {
  it('AC1: single stage double_elimination returns Double elimination', () => {
    expect(deriveFormatLabel([makeStage('double_elimination', 1)], makeTournament())).toBe('Double elimination');
  });

  it('AC2: single stage single_elimination returns Single elimination', () => {
    expect(deriveFormatLabel([makeStage('single_elimination', 1)], makeTournament())).toBe('Single elimination');
  });

  it('AC3: single stage round_robin returns Round robin', () => {
    expect(deriveFormatLabel([makeStage('round_robin', 1)], makeTournament())).toBe('Round robin');
  });

  it('AC4: single stage swiss returns Swiss', () => {
    expect(deriveFormatLabel([makeStage('swiss', 1)], makeTournament())).toBe('Swiss');
  });

  it('AC5: two stages swiss then single_elimination returns Swiss + Single elimination', () => {
    const stages = [makeStage('swiss', 1), makeStage('single_elimination', 2)];
    expect(deriveFormatLabel(stages, makeTournament())).toBe('Swiss + Single elimination');
  });

  it('AC6: three mixed stages returns Multi-stage (3 stages)', () => {
    const stages = [
      makeStage('swiss', 1),
      makeStage('single_elimination', 2),
      makeStage('double_elimination', 3),
    ];
    expect(deriveFormatLabel(stages, makeTournament())).toBe('Multi-stage (3 stages)');
  });

  it('AC7: two stages both double_elimination returns Double elimination', () => {
    const stages = [makeStage('double_elimination', 1), makeStage('double_elimination', 2)];
    expect(deriveFormatLabel(stages, makeTournament())).toBe('Double elimination');
  });

  it('AC8a: zero stages falls back to tournament.format when it has a value', () => {
    expect(deriveFormatLabel([], makeTournament('single_elimination'))).toBe('Single elimination');
  });

  it('AC8b: zero stages with null format returns Not set', () => {
    const t = { ...makeTournament(), format: undefined } as unknown as DashboardTournament;
    expect(deriveFormatLabel([], t)).toBe('Not set');
  });

});

const EMPTY_COMPLETION: CompletionSummary = {
  panels: {},
  totalRequiredMissing: 0,
  totalRecommendedMissing: 0,
  canPublish: false,
  blockingPanels: [],
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useTournamentOverviewModel — BR guard (AC9 integration)', () => {
  it('AC9: isBattleRoyale=true shows "Battle royale" even when stages have a different format', () => {
    const { result } = renderHook(
      () =>
        useTournamentOverviewModel({
          tournament: makeTournament('single_elimination'),
          participants: [],
          // Stages have single_elimination — without the guard this would show "Single elimination"
          stages: [makeStage('single_elimination', 1)],
          mockCount: 0,
          completionSummary: EMPTY_COMPLETION,
          disputeCount: 0,
          reachable: new Set(),
          isBattleRoyale: true,
        }),
      { wrapper: makeWrapper() },
    );
    const formatRow = result.current?.details.find((d) => d.label === 'Format');
    expect(formatRow?.value).toBe('Battle royale');
  });
});
