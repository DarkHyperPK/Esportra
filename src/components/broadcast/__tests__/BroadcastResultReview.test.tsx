import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BroadcastResultReview } from '../BroadcastResultReview';
import { apiClient } from '@/lib/apiClient';
vi.mock('@/lib/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const id = '5e182c34-49f8-40d3-bf6c-88b576c20c45';
const proposal = { id, matchId: id, mapNumber: 1, teamAScore: 13, teamBScore: 7, reason: 'Checked scoreboard', status: 'pending', teamAName: 'North', teamBName: 'South', matchStatus: 'in_progress', currentTeamAScore: 9, currentTeamBScore: 13, createdAt: '2026-10-15T10:00:00Z', reviewedAt: null };
function mount(canReview = true) {
  vi.mocked(apiClient.get).mockResolvedValue({ canReview, proposals: [proposal] });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><BroadcastResultReview showId={id} /></QueryClientProvider>);
}
describe('official result review', () => {
  it('requires an explicit review and confirmation and sends the official scores seen when review opened', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ ok: true, status: 'applied' }); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Review result' }));
    expect(apiClient.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply official result' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(`/api/broadcast/shows/${id}/result-proposals/${id}/review`, { decision: 'apply', currentTeamAScore: 9, currentTeamBScore: 13 }));
    expect(await screen.findByText('Official map result applied. Series scores updated.')).toBeInTheDocument();
  });
  it('shows a stale-result failure without claiming success', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('The official map score changed.')); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Review result' })); fireEvent.click(screen.getByRole('button', { name: 'Apply official result' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('official map score changed');
    expect(screen.queryByText('Official map result applied. Series scores updated.')).not.toBeInTheDocument();
  });
  it('does not offer write actions to viewers', async () => {
    mount(false); await screen.findByText(/Viewing only/);
    expect(screen.queryByRole('button', { name: 'Review result' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });
});
