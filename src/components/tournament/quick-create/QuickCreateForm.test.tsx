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

// ── Form sections ─────────────────────────────────────────────────────────────

describe('QuickCreateForm sections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('QuickCreateForm_NoBracketStyleSection', () => {
    renderForm();
    expect(screen.queryByText(/bracket style/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lobby format/i)).not.toBeInTheDocument();
  });

  it('QuickCreateForm_NoPublishOption', () => {
    renderForm();
    expect(screen.queryByText(/publish now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/after you create it/i)).not.toBeInTheDocument();
  });

  it('QuickCreateForm_NoByeNote', () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/or type a number/i), { target: { value: '6' } });
    expect(screen.queryByText(/first-round bye/i)).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

    expect(await screen.findByText('Give your tournament a name.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('QuickCreateForm_ShowsError_WhenDateMissing', async () => {
    renderForm();

    // Clear the pre-filled date
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

    expect(await screen.findByText('Pick a start date.')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const payload = post.mock.calls[0][1];
    expect(payload.templateId).toBe(template.id);
    expect(payload.description).toBeUndefined();
  });

  it('QuickCreateForm_AlwaysSetsStatusDraft', async () => {
    renderForm();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const payload = post.mock.calls[0][1];
    expect(payload.status).toBe('draft');
    expect(payload.isPublic).toBe(false);
  });

  it('QuickCreateForm_AlwaysSubmitsEmptyStages', async () => {
    renderForm();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const payload = post.mock.calls[0][1];
    expect(payload.stages).toEqual([]);
    expect(payload.status).toBe('draft');
    expect(payload.isPublic).toBe(false);
  });
});
