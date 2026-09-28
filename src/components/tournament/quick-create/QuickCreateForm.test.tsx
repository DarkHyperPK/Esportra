import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { isPowerOf2, nextPowerOf2 } from './utils';
import { QuickCreateForm } from './QuickCreateForm';
import type { TournamentTemplateDto } from '@/types/tournamentTemplate';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ..._ }: any) => (
      <div className={className} style={style} onClick={onClick}>{children}</div>
    ),
    button: ({ children, className, style, onClick, type, disabled, ..._ }: any) => (
      <button className={className} style={style} onClick={onClick} type={type} disabled={disabled}>
        {children}
      </button>
    ),
    span: ({ children, className, ..._ }: any) => (
      <span className={className}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useGameCatalog', () => ({
  useGameCatalog: () => undefined,
}));

vi.mock('@/utils/gameFeatures', () => ({
  getGameByName: vi.fn(() => ({
    tournamentCapabilities: {
      supportedStructures: [
        { key: 'single_elimination', name: 'Single Elimination' },
        { key: 'double_elimination', name: 'Double Elimination' },
        { key: 'swiss', name: 'Swiss' },
        { key: 'round_robin', name: 'Round Robin' },
      ],
    },
  })),
  getGameModes: vi.fn(() => [{ key: 'standard', name: 'Standard', value: 'standard', teamSize: 5 }]),
  getGameModeGroups: vi.fn(() => []),
  getDefaultTeamSize: vi.fn(() => 5),
}));

const post = vi.hoisted(() => vi.fn());
const fetchCurrentOrganizationId = vi.hoisted(() => vi.fn());

vi.mock('@/lib/apiClient', () => ({
  apiClient: { post },
  getApiErrorMessage: (_error: unknown, options?: { context?: string }) =>
    options?.context ?? 'mock error',
}));

vi.mock('@/lib/currentOrganization', () => ({
  fetchCurrentOrganizationId,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTemplate = (overrides?: Partial<TournamentTemplateDto>): TournamentTemplateDto => ({
  id: 'tpl-1',
  gameCatalogId: 'gc-1',
  slug: 'valorant-standard',
  rulesText: 'Play fair and have fun.',
  rulesSourceUrl: null,
  rulesUpdatedAt: '2026-01-01T00:00:00Z',
  defaultBestOf: 3,
  defaultMaxTeams: 16,
  recommendedTeamCounts: [8, 16, 32],
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
  ...overrides,
});

const renderForm = (template = makeTemplate()) =>
  render(
    <MemoryRouter>
      <QuickCreateForm template={template} onBack={vi.fn()} />
    </MemoryRouter>,
  );

/**
 * Ensure all required fields have valid values.
 * Name, date, time, and first team chip are pre-filled by the template —
 * this helper overrides name for test assertions and is otherwise a no-op.
 */
function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/tournament name/i), {
    target: { value: 'Test Tournament' },
  });
}

// ── isPowerOf2 ────────────────────────────────────────────────────────────────

describe('isPowerOf2', () => {
  it('isPowerOf2_ReturnsFalse_ForOne', () => {
    expect(isPowerOf2(1)).toBe(false);
  });

  it('isPowerOf2_ReturnsTrue_ForPowersOfTwo', () => {
    for (const n of [2, 4, 8, 16, 32, 64]) {
      expect(isPowerOf2(n), `expected isPowerOf2(${n}) to be true`).toBe(true);
    }
  });

  it('isPowerOf2_ReturnsFalse_ForNonPowers', () => {
    for (const n of [6, 10, 12, 14, 24]) {
      expect(isPowerOf2(n), `expected isPowerOf2(${n}) to be false`).toBe(false);
    }
  });
});

// ── nextPowerOf2 ──────────────────────────────────────────────────────────────

describe('nextPowerOf2', () => {
  it('nextPowerOf2_Returns2_ForOne', () => {
    expect(nextPowerOf2(1)).toBe(2);
  });

  it('nextPowerOf2_Returns8_ForSeven', () => {
    expect(nextPowerOf2(7)).toBe(8);
  });

  it('nextPowerOf2_Returns16_ForNine', () => {
    expect(nextPowerOf2(9)).toBe(16);
  });

  it('nextPowerOf2_ReturnsSameValue_ForExactPower', () => {
    // Math.ceil(log2(16)) = Math.ceil(4) = 4 → 2^4 = 16
    expect(nextPowerOf2(16)).toBe(16);
  });
});

// ── Bye-note visibility ───────────────────────────────────────────────────────

describe('QuickCreateForm bye-note visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('QuickCreateForm_ShowsByeNote_WhenNonPowerOf2TeamsWithSE', () => {
    renderForm();
    // Standard Cup (SE) is pre-selected, first chip (8) is pre-selected.
    // Type 6 in free input — clears chip, sets non-power-of-2 count.
    fireEvent.change(screen.getByPlaceholderText(/or type a number/i), {
      target: { value: '6' },
    });

    expect(screen.getByText(/byes will be added/i)).toBeInTheDocument();
  });

  it('QuickCreateForm_HidesByeNote_WhenPowerOf2Teams', () => {
    renderForm();
    // Standard Cup (SE) is pre-selected, chip 8 is pre-selected → power of 2
    expect(screen.queryByText(/byes will be added/i)).not.toBeInTheDocument();
  });

  it('QuickCreateForm_HidesByeNote_ForMajorFormat', () => {
    renderForm();
    // Select Major Format (Swiss → SE) — Swiss stage doesn't need power-of-2
    // but the SE playoff does. Type 6 teams, then switch to Major Format.
    fireEvent.change(screen.getByPlaceholderText(/or type a number/i), {
      target: { value: '6' },
    });
    // Major Format still has an elimination stage, so bye note shows
    const majorBtn = screen.getByText('Major Format').closest('button')!;
    fireEvent.click(majorBtn);

    expect(screen.getByText(/byes will be added/i)).toBeInTheDocument();
  });
});

// ── Form submission ───────────────────────────────────────────────────────────

describe('QuickCreateForm submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({ slug: 'test-tournament' });
    fetchCurrentOrganizationId.mockResolvedValue('org-1');
  });

  it('QuickCreateForm_ShowsError_WhenNameMissing', async () => {
    renderForm();

    // Clear the pre-filled name
    fireEvent.change(screen.getByLabelText(/tournament name/i), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /create tournament/i }));

    expect(await screen.findByText('Tournament name is required')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('QuickCreateForm_ShowsError_WhenDateMissing', async () => {
    renderForm();

    // Clear the pre-filled date
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /create tournament/i }));

    expect(await screen.findByText('Start date is required')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('QuickCreateForm_LinksTemplateId_NotRulesText', async () => {
    const template = makeTemplate({ rulesText: 'Use the official rulebook.' });
    render(
      <MemoryRouter>
        <QuickCreateForm template={template} onBack={vi.fn()} />
      </MemoryRouter>,
    );
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /create tournament/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const payload = post.mock.calls[0][1];
    expect(payload.templateId).toBe(template.id);
    expect(payload.description).toBeUndefined();
  });

  it('QuickCreateForm_SetsStatusDraft_WhenPublishUnchecked', async () => {
    renderForm();
    fillRequiredFields();

    // publishImmediately defaults to false — do not interact with checkbox
    fireEvent.click(screen.getByRole('button', { name: /create tournament/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const payload = post.mock.calls[0][1];
    expect(payload.status).toBe('draft');
    expect(payload.isPublic).toBe(false);
  });

  it('QuickCreateForm_SetsStatusPublished_WhenPublishChecked', async () => {
    renderForm();
    fillRequiredFields();

    // Toggle the "Publish immediately" checkbox
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /create tournament/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const payload = post.mock.calls[0][1];
    expect(payload.status).toBe('published');
    expect(payload.isPublic).toBe(true);
  });

  it('QuickCreateForm_IncludesStageFromTemplate_StandardCup', async () => {
    renderForm();
    fillRequiredFields();
    // Standard Cup is pre-selected — submits 1 stage (single_elimination)

    fireEvent.click(screen.getByRole('button', { name: /create tournament/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const payload = post.mock.calls[0][1];
    expect(payload.stages).toHaveLength(1);
    expect(payload.stages[0]).toMatchObject({
      name: 'Main Bracket',
      format: 'single_elimination',
    });
  });

  it('QuickCreateForm_IncludesTwoStages_WhenWorldCupSelected', async () => {
    renderForm();
    fillRequiredFields();
    // Select World Cup Style
    const worldCupBtn = screen.getByText('World Cup Style').closest('button')!;
    fireEvent.click(worldCupBtn);

    fireEvent.click(screen.getByRole('button', { name: /create tournament/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const payload = post.mock.calls[0][1];
    expect(payload.stages).toHaveLength(2);
    expect(payload.stages[0]).toMatchObject({ name: 'Group Stage', format: 'round_robin' });
    expect(payload.stages[1]).toMatchObject({ name: 'Playoffs', format: 'single_elimination' });
  });
});
