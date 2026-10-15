import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RundownPlanEditor } from '../RundownPlanEditor';
import { RundownTemplates } from '../RundownTemplates';
import { apiClient } from '@/lib/apiClient';
vi.mock('@/lib/apiClient', () => ({ apiClient: { put: vi.fn(), get: vi.fn(), post: vi.fn() }, getApiErrorMessage: (_error: unknown, fallback: string) => fallback }));
const id = '00000000-0000-4000-8000-000000000061';
function mount(child: React.ReactNode) { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{child}</QueryClientProvider>); }
afterEach(cleanup); beforeEach(() => vi.clearAllMocks());
describe('rundown item planning', () => {
  it('requires valid windows, saves supported live cues and does not enable unavailable tournament cues', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ success: true });
    mount(<RundownPlanEditor segment={{ id, showId: id, title: 'Map', type: 'match', estimatedDuration: null, status: 'pending', displayOrder: 0, notes: null, overlay: 'ingame' }} />);
    fireEvent.click(screen.getByText(/Cue & take settings/));
    const mode = screen.getByLabelText('Item take mode');
    expect(screen.getByRole('option', { name: 'Automatic after live cue' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Item cue'), { target: { value: 'round_live' } });
    fireEvent.change(mode, { target: { value: 'automatic' } });
    fireEvent.change(screen.getByLabelText('Item hold policy'), { target: { value: 'window' } });
    fireEvent.change(screen.getByLabelText('Item hold seconds'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save item flow' }));
    expect(await screen.findByText('Hold window must be 1–60 seconds.')).toBeInTheDocument(); expect(apiClient.put).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Item hold seconds'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save item flow' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(`/api/broadcast/shows/${id}/segments/${id}/plan`, expect.objectContaining({ trigger: 'round_live', mode: 'automatic', holdSeconds: 5, graphics: ['ingame'] })));
  });
  it('retries imports with the same identity and rejects wrong series formats in the picker', async () => {
    const plan = { trigger: 'manual', mode: 'manual', holdMode: 'manual', holdSeconds: 5, graphics: ['starting-soon'] };
    vi.mocked(apiClient.get).mockResolvedValue([1, 3].map(bestOf => ({ id: `bo${bestOf}`, name: `Best of ${bestOf}`, bestOf, items: [{ title: 'Opening', type: 'pre_show', overlay: 'starting-soon', plan }] })));
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ count: 9, alreadyImported: true });
    mount(<RundownTemplates showId={id} locked={false} match={{ id, showId: id, matchId: id, matchCode: 'FINAL', matchTitle: 'North vs South', displayOrder: 0, status: 'pending', bestOf: 1 }} />);
    const add = await screen.findByRole('button', { name: 'Add Best of 1 flow' });
    expect(screen.getByRole('button', { name: 'Add Best of 3 flow' })).toBeDisabled();
    fireEvent.click(add); await screen.findByText(/Retry keeps the same request/); fireEvent.click(add);
    await screen.findByText(/9 flow items already added/);
    const calls = vi.mocked(apiClient.post).mock.calls; expect(calls[0][1]).toEqual(calls[1][1]);
  });
});
