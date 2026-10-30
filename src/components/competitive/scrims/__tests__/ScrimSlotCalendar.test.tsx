import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ScrimSlotCalendar } from '../ScrimSlotCalendar';
import type { ScrimListing, ScrimSlot } from '@/types/competitive';

const mockSlotsQuery = { data: undefined as ScrimSlot[] | undefined, isLoading: false, isError: false, refetch: vi.fn() };
const mockBookMutation = { mutateAsync: vi.fn(), isPending: false };
const mockTeamsQuery = { data: [{ id: 'team-mine', name: 'My Team', gameSlug: 'valorant' }] };

vi.mock('@/hooks/competitive/useScrims', () => ({
  useScrimSlots: () => mockSlotsQuery,
  useBookScrimSlot: () => mockBookMutation,
}));

vi.mock('@/hooks/useNavTeamStatus', () => ({
  useMyTeamsSummary: () => mockTeamsQuery,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const baseListing: ScrimListing = {
  id: 'listing-1',
  teamId: 'team-a',
  gameSlug: 'valorant',
  modeKey: null,
  regionKey: null,
  minRankKey: null,
  maxRankKey: null,
  scheduleType: 'recurring',
  scheduleUntil: null,
  preferredDays: [1, 3],
  preferredTimeStart: null,
  preferredTimeEnd: null,
  timezone: null,
  slotDurationMinutes: 90,
  notes: null,
  status: 'open',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  teamName: 'Storm Riders',
};

const slot1: ScrimSlot = {
  id: 'slot-1',
  listingId: 'listing-1',
  startsAt: '2026-11-03T19:00:00Z',
  endsAt: '2026-11-03T20:30:00Z',
  status: 'available',
  createdAt: '2026-10-01T00:00:00Z',
};

const bookedSlot: ScrimSlot = {
  id: 'slot-2',
  listingId: 'listing-1',
  startsAt: '2026-11-03T21:00:00Z',
  endsAt: '2026-11-03T22:30:00Z',
  status: 'booked',
  createdAt: '2026-10-01T00:00:00Z',
  bookedByTeamId: 'team-other',
};

beforeEach(() => {
  mockSlotsQuery.data = undefined;
  mockSlotsQuery.isLoading = false;
  mockSlotsQuery.isError = false;
  mockBookMutation.isPending = false;
  mockBookMutation.mutateAsync.mockReset();
});

describe('ScrimSlotCalendar', () => {
  it('S3-none: renders nothing for non-recurring listing', () => {
    const { container } = render(
      <ScrimSlotCalendar listing={{ ...baseListing, scheduleType: 'one_off' }} onSlotSelected={vi.fn()} />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it('S3-2: shows availability-not-set notice when no slots and no preferredDays', () => {
    mockSlotsQuery.data = [];
    render(
      <ScrimSlotCalendar listing={{ ...baseListing, preferredDays: null }} onSlotSelected={vi.fn()} />,
      { wrapper },
    );
    expect(screen.getByText(/hasn.+set their availability yet/i)).toBeInTheDocument();
  });

  it('S3-4: renders an available slot and a booked slot', () => {
    mockSlotsQuery.data = [slot1, bookedSlot];
    render(<ScrimSlotCalendar listing={baseListing} onSlotSelected={vi.fn()} />, { wrapper });
    expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });

  it('S3-4: selecting a slot shows the ActionBar with "Confirm booking"', () => {
    mockSlotsQuery.data = [slot1];
    render(<ScrimSlotCalendar listing={baseListing} onSlotSelected={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument();
  });

  it('S3-4: Back button deselects the slot and hides ActionBar', () => {
    mockSlotsQuery.data = [slot1];
    render(<ScrimSlotCalendar listing={baseListing} onSlotSelected={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.queryByRole('button', { name: /confirm booking/i })).not.toBeInTheDocument();
  });

  it('S3-8: shows success notice after booking', async () => {
    mockSlotsQuery.data = [slot1];
    mockBookMutation.mutateAsync.mockResolvedValue({ id: 'offer-1' });
    render(<ScrimSlotCalendar listing={baseListing} onSlotSelected={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    expect(await screen.findByText(/offer sent/i)).toBeInTheDocument();
  });

  it('S3-3: shows "no available slots" when all slots are booked', () => {
    mockSlotsQuery.data = [bookedSlot];
    render(<ScrimSlotCalendar listing={baseListing} onSlotSelected={vi.fn()} />, { wrapper });
    expect(screen.getByText(/no available slots right now/i)).toBeInTheDocument();
  });

  it('S3-9: shows error notice when slot query fails', () => {
    mockSlotsQuery.isError = true;
    render(<ScrimSlotCalendar listing={baseListing} onSlotSelected={vi.fn()} />, { wrapper });
    expect(screen.getByText(/couldn.+t load available slots/i)).toBeInTheDocument();
  });
});
