
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreateTournamentForm from '../CreateTournamentForm';

// Mock the hooks
vi.mock('@/hooks/useTournamentCreation', () => ({
  useTournamentCreation: vi.fn()
}));

// Mock the child components
vi.mock('../TournamentBasicInfoForm', () => ({
  default: () => <div data-testid="basic-info-form">Basic Info Form</div>
}));

vi.mock('../TournamentDetailsForm', () => ({
  default: () => <div data-testid="details-form">Details Form</div>
}));

vi.mock('@/components/admin/ErrorDisplay', () => ({
  default: ({ message }: { message: string }) => <div data-testid="error-display">{message}</div>
}));

// Import after mocking
import { useTournamentCreation } from '@/hooks/useTournamentCreation';

describe('CreateTournamentForm', () => {
  beforeEach(() => {
    vi.mocked(useTournamentCreation).mockReset();
  });

  it('renders the form correctly', () => {
    // Set up the mock implementation
    vi.mocked(useTournamentCreation).mockReturnValue({
      formData: {
        name: '',
        game: '',
        date: '',
        time: '',
        venue: '',
        maxParticipants: '',
        prizePool: '',
        entryFee: 'Free',
        isOnline: false,
        description: ''
      },
      handleInputChange: vi.fn(),
      handleSelectChange: vi.fn(),
      handleCheckboxChange: vi.fn(),
      handleSubmit: vi.fn(),
      error: null,
      isSubmitting: false
    });

    render(<CreateTournamentForm />);
    
    expect(screen.getByText('Host a Tournament')).toBeInTheDocument();
    expect(screen.getByTestId('basic-info-form')).toBeInTheDocument();
    expect(screen.getByTestId('details-form')).toBeInTheDocument();
    expect(screen.getByText('Create Tournament')).toBeInTheDocument();
  });

  it('shows error message when error exists', () => {
    // Override the mock to include an error
    vi.mocked(useTournamentCreation).mockReturnValue({
      formData: {
        name: '',
        game: '',
        date: '',
        time: '',
        venue: '',
        maxParticipants: '',
        prizePool: '',
        entryFee: 'Free',
        isOnline: false,
        description: ''
      },
      handleInputChange: vi.fn(),
      handleSelectChange: vi.fn(),
      handleCheckboxChange: vi.fn(),
      handleSubmit: vi.fn(),
      error: 'Test error message',
      isSubmitting: false
    });

    render(<CreateTournamentForm />);
    
    expect(screen.getByTestId('error-display')).toBeInTheDocument();
  });

  it('shows loading state when submitting', () => {
    // Override the mock to include isSubmitting as true
    vi.mocked(useTournamentCreation).mockReturnValue({
      formData: {
        name: '',
        game: '',
        date: '',
        time: '',
        venue: '',
        maxParticipants: '',
        prizePool: '',
        entryFee: 'Free',
        isOnline: false,
        description: ''
      },
      handleInputChange: vi.fn(),
      handleSelectChange: vi.fn(),
      handleCheckboxChange: vi.fn(),
      handleSubmit: vi.fn(),
      error: null,
      isSubmitting: true
    });

    render(<CreateTournamentForm />);
    
    expect(screen.getByText('Creating Tournament...')).toBeInTheDocument();
  });
});
