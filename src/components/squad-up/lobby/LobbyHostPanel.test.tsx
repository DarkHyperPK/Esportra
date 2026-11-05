import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { lobbySchema, type LobbyMember } from '@/schemas/squadUpLobby';
import { LobbyHostPanel } from './LobbyHostPanel';

const lobby = lobbySchema.parse({
  id: 'l1', hostId: 'me', title: 'Comp tonight', mode: 'competitive', region: 'ap', countryCode: 'PK', area: 'south-asia',
  openSlots: 4, acceptedCount: 1, wantedRoles: ['controller'], micRequired: true, status: 'open', createdAt: '2026-11-05T10:00:00Z',
  conversationId: 'c1', membersJson: '[{"user_id":"u2","username":"Joined"}]',
});
const member = (userId: string, username: string, status: LobbyMember['status']): LobbyMember =>
  ({ userId, username, status, roleKey: 'controller', createdAt: '2026-11-05T10:00:00Z' });

function renderPanel(overrides: Partial<Parameters<typeof LobbyHostPanel>[0]> = {}) {
  const handlers = { onAccept: vi.fn(), onDecline: vi.fn(), onKick: vi.fn(), onClose: vi.fn() };
  render(
    <MemoryRouter>
      <LobbyHostPanel lobby={lobby} members={[member('u1', 'Asker', 'requested'), member('u2', 'Joined', 'accepted')]} myId="me" busy={false}
        {...handlers} {...overrides} />
    </MemoryRouter>,
  );
  return handlers;
}

describe('LobbyHostPanel', () => {
  it('shows open slots, requests, members and the group chat link', () => {
    renderPanel();
    expect(screen.getByText(/3 of 4 slots open/)).toBeInTheDocument();
    expect(screen.getByText('Asker')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In your lobby' }).nextElementSibling).toHaveTextContent('Joined');
    expect(screen.getByRole('link', { name: /Group chat/ })).toHaveAttribute('href', '/inbox/c1');
  });

  it('accepts, declines and removes the right player', () => {
    const handlers = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close lobby' }));
    expect(handlers.onAccept).toHaveBeenCalledWith('u1');
    expect(handlers.onDecline).toHaveBeenCalledWith('u1');
    expect(handlers.onKick).toHaveBeenCalledWith('u2');
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('blocks accepting once the lobby is full', () => {
    renderPanel({ lobby: { ...lobby, status: 'full', acceptedCount: 4 } });
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
    expect(screen.getByText(/Full\. Share the party code/)).toBeInTheDocument();
  });
});
