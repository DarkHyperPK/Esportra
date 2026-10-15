import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FollowBracketSettings } from '../FollowBracketSettings';
import { apiClient } from '@/lib/apiClient';
vi.mock('@/lib/apiClient', () => ({ apiClient: { get: vi.fn(), put: vi.fn() }, getApiErrorMessage: (error: Error) => error.message }));
const id = '5e182c34-49f8-40d3-bf6c-88b576c20c45';
const settings = { enabled: false, stageIds: [], revision: 0, checkedAt: null, atCapacity: false, stages: [{ id, name: 'Playoffs' }] };
describe('stage following', () => {
  it('requires a stage when enabled and saves the existing stage without creating tournament data', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(settings); vi.mocked(apiClient.put).mockResolvedValue({ added: 1, revision: 1, atCapacity: false });
    render(<QueryClientProvider client={new QueryClient()}><FollowBracketSettings showId={id} locked={false} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByLabelText('Automatically include upcoming matches')).toBeEnabled());
    fireEvent.click(screen.getByLabelText('Automatically include upcoming matches'));
    expect(screen.getByRole('button', { name: 'Save stage following' })).toBeDisabled(); fireEvent.click(screen.getByLabelText('Playoffs'));
    fireEvent.click(screen.getByRole('button', { name: 'Save stage following' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(`/api/broadcast/shows/${id}/enrollment`, { enabled: true, stageIds: [id], revision: 0 }));
    expect(await screen.findByText('Stage following saved. Stopping it keeps already included matches.')).toBeInTheDocument();
  });
});
