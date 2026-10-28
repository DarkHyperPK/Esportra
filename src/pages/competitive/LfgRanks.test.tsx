import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LfgCreateWizardPage from './LfgCreateWizardPage';
import LfgEditPage from './LfgEditPage';

const state = vi.hoisted(() => ({
  save: vi.fn(), update: vi.fn(), refetch: vi.fn(), linked: true, intent: 'looking_for_team',
  ranks: [{ id: 'rank', sortOrder: 4, displayName: 'Silver 2', iconUrl: null }],
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' }, profile: { username: 'Player' } }) }));
vi.mock('@/hooks/useGameCatalogContext', () => ({ useGameCatalogContext: () => ({ games: [{ slug: 'valorant', name: 'Valorant' }] }) }));
vi.mock('@/hooks/competitive/useCatalog', () => ({
  useCatalogGameRoles: () => ({ data: [] }), useCatalogRankTiers: () => ({ data: state.ranks }), useCatalogRegions: () => ({ data: [] }),
}));
vi.mock('@/hooks/competitive/useLfg', () => ({
  useLfgCaptainTeams: () => ({ data: [{ id: 'team', name: 'Team' }] }),
  useMyGameStats: () => ({ refetch: state.refetch, data: { riotLinked: state.linked, competitiveTierName: 'Gold 1', syncStatus: 'complete', syncedAt: '2026-10-28' } }),
  useSaveLfgDraft: () => ({ mutateAsync: state.save }),
  useUpdateLfgListing: () => ({ mutateAsync: state.update }),
  useLfgListing: () => ({ data: { id: 'listing', userId: 'owner', gameSlug: 'valorant', intent: state.intent, status: 'draft', minRankSortOrder: 4, maxRankSortOrder: 7 } }),
}));
vi.mock('@/components/competitive/LfgWorkspace', () => ({ LfgWorkspace: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/competitive/LfgListingCard', () => ({ LfgListingCard: () => null }));
vi.mock('@/components/competitive/LfgAgentPicker', () => ({ LfgAgentPicker: () => null }));
vi.mock('@/components/competitive/LfgRolePicker', () => ({ LfgRolePicker: () => null }));
vi.mock('@/components/competitive/LfgLanguagePicker', () => ({ LfgLanguagePicker: () => null }));
vi.mock('@/components/competitive/LfgRankSelect', () => ({ LfgRankSelect: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <label>{label}<select value={value} onChange={event => onChange(event.target.value)}><option value="">Any</option><option value="4">Silver 2</option><option value="7">Gold 2</option></select></label> }));

function create(type: 'lft' | 'lfp') {
  render(<MemoryRouter initialEntries={[`/competitive/lfg/create?type=${type}`]}><Routes><Route path="/competitive/lfg/create" element={<LfgCreateWizardPage />} /><Route path="/competitive/lfg/mine" element={<p>Saved</p>} /></Routes></MemoryRouter>);
}
function edit() {
  render(<MemoryRouter initialEntries={['/competitive/lfg/listing/edit']}><Routes><Route path="/competitive/lfg/:id/edit" element={<LfgEditPage />} /><Route path="/competitive/lfg/:id" element={<p>Saved</p>} /></Routes></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); state.intent = 'looking_for_team'; state.linked = true; state.save.mockResolvedValue({}); state.update.mockResolvedValue({}); });

describe('LFG rank ownership', () => {
  it('creates LFT without recruiting rank requirements', async () => {
    create('lft');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Current rank: Gold 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByLabelText('Minimum rank')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Maximum rank')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ request: expect.not.objectContaining({ minRankSortOrder: expect.anything(), maxRankSortOrder: expect.anything() }) })));
  });
  it('retains the required rank range for LFP', async () => {
    create('lfp');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Recruiting team'), { target: { value: 'team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Minimum rank'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Maximum rank'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ request: expect.objectContaining({ minRankSortOrder: 4, maxRankSortOrder: 7 }) })));
  });
  it('clears legacy LFT rank requirements when editing', async () => {
    edit();
    expect(screen.getByLabelText('Current rank: Gold 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Minimum rank')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ clearMinRank: true, clearMaxRank: true })));
  });
  it('preserves LFP requirements when editing', async () => {
    state.intent = 'looking_for_player';
    edit();
    expect(screen.getByLabelText('Minimum rank')).toHaveValue('4');
    expect(screen.getByLabelText('Maximum rank')).toHaveValue('7');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ minRankSortOrder: 4, maxRankSortOrder: 7, clearMinRank: false, clearMaxRank: false })));
  });
  it.each(['lft', 'lfp'] as const)('requires Riot linking for %s and preserves the valid settings destination', type => {
    state.linked = false;
    create(type);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Connect Riot account' })).toHaveAttribute('href', '/account/settings');
    expect(state.save).not.toHaveBeenCalled();
  });

  it('refreshes Riot link status when returning from account settings', () => {
    state.linked = false;
    create('lft');
    fireEvent.focus(window);
    expect(state.refetch).toHaveBeenCalledOnce();
  });

});
