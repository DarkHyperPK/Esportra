import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HudAppearanceSetup } from '../HudAppearanceSetup';
import { apiClient } from '@/lib/apiClient';
import { DEFAULT_APPEARANCE } from '@/schemas/broadcastAppearanceSchema';
import type { BroadcastShowDetail, ShowMatchSlot } from '@/types/broadcast';
vi.mock('@/lib/apiClient', () => ({ apiClient: { get: vi.fn(), put: vi.fn() }, getApiErrorMessage: (error: Error) => error.message }));
vi.mock('@/hooks/useHudPreviewFonts', () => ({ useHudPreviewFonts: () => ({}) }));
const id = '5e182c34-49f8-40d3-bf6c-88b576c20c45';
function mount() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><HudAppearanceSetup show={{ id, title: 'Final', tournamentName: 'Invitational' } as BroadcastShowDetail} match={{ matchId: id, teamA: 'North', teamB: 'South', bestOf: 3 } as ShowMatchSlot} locked={false} /></QueryClientProvider>); }
describe('HUD appearance setup', () => {
  it('saves match-scoped overrides and selected theme, rotation, and event bug without tournament writes', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(DEFAULT_APPEARANCE);
    vi.mocked(apiClient.put).mockImplementation(async (_path, value) => ({ ...value as object, revision: 1 })); mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save appearance' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('North · Broadcast display name'), { target: { value: 'North on air' } });
    fireEvent.change(screen.getByLabelText('Banner theme'), { target: { value: 'compact' } });
    fireEvent.change(screen.getByLabelText('Stinger transition for new screens'), { target: { value: 'Fixture Stinger' } });
    fireEvent.click(screen.getByLabelText('Rotate active sponsor logos')); fireEvent.click(screen.getByLabelText('Show tournament name in event bug'));
    fireEvent.click(screen.getByRole('button', { name: 'Save appearance' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(`/api/broadcast/shows/${id}/appearance`, expect.objectContaining({ bannerTheme: 'compact', sponsorRotation: false, eventBug: false, stingerName: 'Fixture Stinger', matches: { [id]: [{ displayName: 'North on air' }, {}] }, revision: 0 })));
    expect(await screen.findByText('Appearance saved. Send match to Air.')).toBeInTheDocument();
  });
  it('retains unsaved choices on a conflict and reloads the latest saved revision explicitly', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ ...DEFAULT_APPEARANCE, revision: 2 });
    vi.mocked(apiClient.put).mockRejectedValue(new Error('Appearance changed in another window. Reload before saving.')); mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save appearance' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Banner theme'), { target: { value: 'impact' } }); fireEvent.click(screen.getByRole('button', { name: 'Save appearance' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('another window'); expect(screen.getByLabelText('Banner theme')).toHaveValue('impact');
    vi.mocked(apiClient.get).mockResolvedValue({ ...DEFAULT_APPEARANCE, bannerTheme: 'monument', revision: 3 }); fireEvent.click(screen.getByRole('button', { name: 'Reload saved appearance' }));
    await waitFor(() => expect(screen.getByLabelText('Banner theme')).toHaveValue('monument'));
  });
});
