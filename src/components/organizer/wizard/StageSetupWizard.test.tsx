import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StageSetupWizard } from '@/components/organizer/wizard/StageSetupWizard';

vi.mock('@/hooks/useGameCatalog', () => ({
  useGameCatalog: () => undefined,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(async (path: string) => {
      if (path.endsWith('/participants')) return [];
      if (path.includes('/api/tournaments/')) {
        return { tournament: { check_in_required: false, max_teams: 16 } };
      }
      return null;
    }),
    put: vi.fn(),
    post: vi.fn(),
  },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

describe('StageSetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays on manual setup after choosing to build it yourself', async () => {
    render(
      <StageSetupWizard
        open
        onOpenChange={vi.fn()}
        tournamentId="tournament-1"
        game="Valorant"
        existingStages={[]}
        onComplete={vi.fn()}
      />,
    );

    expect(await screen.findByText('Build it yourself')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Build it yourself'));

    await waitFor(() => {
      expect(screen.queryByText('Start from a template')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Review stages/i)).toBeInTheDocument();
  });

  it('advances to template selection after choosing a template start', async () => {
    render(
      <StageSetupWizard
        open
        onOpenChange={vi.fn()}
        tournamentId="tournament-1"
        game="Valorant"
        existingStages={[]}
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByText('Start from a template'));

    await waitFor(() => {
      expect(screen.getByText('Pick a template')).toBeInTheDocument();
    });
  });

  it('lets you save after removing every existing stage', async () => {
    render(
      <StageSetupWizard
        open
        onOpenChange={vi.fn()}
        tournamentId="tournament-1"
        game="Valorant"
        existingStages={[{ id: 'stage-1', name: 'Main bracket', format: 'single_elimination', capacity: 16 }]}
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Remove Main bracket' }));

    const review = screen.getByRole('button', { name: /Review stages/i });
    expect(review).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Back/i })).not.toBeInTheDocument();

    fireEvent.click(review);
    expect(await screen.findByText(/Saving will remove every stage/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save stages' })).toBeEnabled();
  });
});
