
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Create from '../Create';

// Mock the components used
vi.mock('@/components/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>
}));

vi.mock('@/components/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>
}));

vi.mock('@/components/tournament/CreateTournamentForm', () => ({
  default: () => <div data-testid="create-tournament-form">CreateTournamentForm</div>
}));

vi.mock('@/components/admin/AccessDenied', () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="access-denied">{message}</div>
  )
}));

// Mock the auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '@/hooks/useAuth';

describe('Create Tournament Page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockClear();
  });

  it('shows sign in message when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      hasRole: () => false
    } as any);

    render(<Create />);
    
    expect(screen.getByText('You must be signed in to create tournaments.')).toBeInTheDocument();
  });

  it('shows access denied when user does not have organizer role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123' },
      hasRole: (role: string) => role !== 'organizer'
    } as any);

    render(<Create />);
    
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.getByText('You need Tournament Organizer privileges to create tournaments.')).toBeInTheDocument();
  });

  it('renders the create tournament form for organizers', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123' },
      hasRole: (role: string) => role === 'organizer'
    } as any);

    render(<Create />);
    
    expect(screen.getByTestId('create-tournament-form')).toBeInTheDocument();
  });
});
