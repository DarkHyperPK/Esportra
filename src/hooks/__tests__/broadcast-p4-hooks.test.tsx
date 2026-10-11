import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useSponsorProof } from '@/hooks/useSponsorProof';
import { useVodChapters } from '@/hooks/useVodChapters';
import { usePostShowReport } from '@/hooks/usePostShowReport';

// ── Hoisted: must be declared before vi.mock is resolved ──────────────────────

const MockApiError = vi.hoisted(() => {
  class _MockApiError extends Error {
    public readonly status: number;
    public readonly body: unknown;
    constructor(status: number, body: unknown, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.body = body;
    }
  }
  return _MockApiError;
});

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
  ApiError: MockApiError,
  getApiErrorMessage: (_e: unknown) => 'mock error',
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const mockedGet = vi.mocked(apiClient.get);

// ── Fixture data ─────────────────────────────────────────────────────────────

const sponsorProofFixture = {
  showId: 'show-1',
  showTitle: 'Test Show',
  generatedAt: '2026-10-11T10:00:00Z',
  sponsors: [
    {
      sponsorId: 'sp-1',
      name: 'Acme',
      totalOnAirSeconds: 120,
      placementCount: 3,
      bySlotType: {
        bug: { totalSeconds: 120, count: 3 },
      },
      hasIncomplete: false,
      incompleteCount: 0,
    },
  ],
};

const vodChaptersFixture = {
  showId: 'show-1',
  chapters: [
    {
      segmentId: 'seg-1',
      segmentName: 'Match 1',
      segmentType: 'match',
      offsetSeconds: 300,
      durationSeconds: 1800,
      incomplete: false,
    },
  ],
};

const postShowReportFixture = {
  show: {
    id: 'show-1',
    title: 'Test Show',
    scheduledAt: '2026-10-10T18:00:00Z',
    startedAt: '2026-10-10T18:02:00Z',
    endedAt: '2026-10-10T21:30:00Z',
    durationSeconds: 12480,
  },
  matches: [],
  crew: [],
  sponsors: [],
  chapters: [],
  corrections: { count: 0 },
  players: [],
};

// ── useSponsorProof ───────────────────────────────────────────────────────────

describe('useSponsorProof', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns parsed sponsors on success', async () => {
    mockedGet.mockResolvedValue(sponsorProofFixture);
    const { result } = renderHook(() => useSponsorProof('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sponsors).toHaveLength(1);
    expect(result.current.data?.sponsors[0].name).toBe('Acme');
  });

  it('surfaces an error when the API call fails', async () => {
    mockedGet.mockRejectedValue(new Error('network fail'));
    const { result } = renderHook(() => useSponsorProof('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('does not fire when showId is undefined', () => {
    mockedGet.mockResolvedValue(sponsorProofFixture);
    const { result } = renderHook(() => useSponsorProof(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useVodChapters ────────────────────────────────────────────────────────────

describe('useVodChapters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns chapters on success', async () => {
    mockedGet.mockResolvedValue(vodChaptersFixture);
    const { result } = renderHook(() => useVodChapters('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.showNotEnded).toBe(false);
    expect(result.current.data?.chapters).toHaveLength(1);
    expect(result.current.data?.chapters[0].segmentName).toBe('Match 1');
  });

  it('returns showNotEnded=true without throwing on a 409', async () => {
    mockedGet.mockRejectedValue(new MockApiError(409, {}, 'Show not ended'));
    const { result } = renderHook(() => useVodChapters('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.showNotEnded).toBe(true);
    expect(result.current.data?.chapters).toHaveLength(0);
  });

  it('propagates non-409 errors', async () => {
    mockedGet.mockRejectedValue(new Error('timeout'));
    const { result } = renderHook(() => useVodChapters('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── usePostShowReport ─────────────────────────────────────────────────────────

describe('usePostShowReport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the parsed report on success', async () => {
    mockedGet.mockResolvedValue(postShowReportFixture);
    const { result } = renderHook(() => usePostShowReport('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.report?.show.title).toBe('Test Show');
    expect(result.current.data?.showNotEnded).toBe(false);
    expect(result.current.data?.forbidden).toBe(false);
  });

  it('returns forbidden=true without throwing on a 403', async () => {
    mockedGet.mockRejectedValue(new MockApiError(403, {}, 'Forbidden'));
    const { result } = renderHook(() => usePostShowReport('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.forbidden).toBe(true);
    expect(result.current.data?.report).toBeNull();
  });

  it('returns showNotEnded=true without throwing on a 409', async () => {
    mockedGet.mockRejectedValue(new MockApiError(409, {}, 'Show not ended'));
    const { result } = renderHook(() => usePostShowReport('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.showNotEnded).toBe(true);
    expect(result.current.data?.report).toBeNull();
  });

  it('propagates other errors', async () => {
    mockedGet.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => usePostShowReport('show-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
