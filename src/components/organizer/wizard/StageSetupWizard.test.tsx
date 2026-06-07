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

  it('stays on manual setup after clicking Manual Setup', async () => {
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

    expect(await screen.findByText('Manual Setup')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Manual Setup'));

    await waitFor(() => {
      expect(screen.queryByText('Advanced Templates')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Finish & Review/i)).toBeInTheDocument();
  });

  it('advances to template selection after clicking Advanced Templates', async () => {
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

    fireEvent.click(await screen.findByText('Advanced Templates'));

    await waitFor(() => {
      expect(screen.getByText('Select a Template')).toBeInTheDocument();
    });
  });
});
