import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { announceSquadUpLike, announceSquadUpMatch } from '@/hooks/competitive/squadUpPopups';
import { SquadUpPopupHost } from './SquadUpPopupHost';

const toast = vi.hoisted(() => vi.fn());
const matchesData = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/competitive/useSquadUp', () => ({ useSquadUpMatches: () => matchesData }));

function mount(path = '/') {
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><SquadUpPopupHost /></MemoryRouter></QueryClientProvider>);
  return client;
}
const base = { matchId: 'm1', conversationId: 'c1', title: "It's a match!", message: 'Fallback text', sessionEnded: false, details: null };

describe('SquadUpPopupHost', () => {
  beforeEach(() => { toast.mockClear(); matchesData.data = undefined; });

  it('shows the match with the Riot ID and a chat link', async () => {
    const client = mount();
    await act(async () => announceSquadUpMatch(client, { ...base, details: { matchId: 'm1', matchedUserId: 'u', matchedUsername: 'Ace', matchedAt: 'now', conversationId: 'c1', riotGameName: 'Ace', riotTagLine: 'NA1' } }));
    expect(await screen.findByText(/You and Ace want to squad up/)).toBeInTheDocument();
    expect(screen.getByText('Ace#NA1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open chat' })).toHaveAttribute('href', '/inbox/c1');
  });

  it('falls back to the notification text and then resolves details from the matches list', async () => {
    const client = mount();
    await act(async () => announceSquadUpMatch(client, base));
    expect(await screen.findByText(/Fallback text/)).toBeInTheDocument();
    matchesData.data = [{ matchId: 'm1', matchedUsername: 'Zed', conversationId: 'c1', riotGameName: 'Zed', riotTagLine: 'EU1' }];
    await act(async () => announceSquadUpMatch(client, { ...base, sessionEnded: true }));
    expect(await screen.findByText(/You and Zed want to squad up/)).toBeInTheDocument();
    expect(screen.getByText(/your Squad Up session is over/)).toBeInTheDocument();
  });

  it('closes on dismiss and does not reopen for the same match', async () => {
    const client = mount();
    await act(async () => announceSquadUpMatch(client, base));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep going' }));
    await waitFor(() => expect(screen.queryByText("It's a match!")).not.toBeInTheDocument());
    await act(async () => announceSquadUpMatch(client, base));
    expect(screen.queryByText("It's a match!")).not.toBeInTheDocument();
  });

  it('toasts a liked-you ping elsewhere but stays quiet on the Squad Up page', async () => {
    const elsewhere = mount('/tournaments');
    await act(async () => announceSquadUpLike(elsewhere, 2));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: '2 players want to squad up' })));
    toast.mockClear();
    const onPage = mount('/competitive/squad-up');
    await act(async () => announceSquadUpLike(onPage, 1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(toast).not.toHaveBeenCalled();
  });
});
