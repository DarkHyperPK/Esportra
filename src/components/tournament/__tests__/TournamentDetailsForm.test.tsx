
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TournamentDetailsForm from '../TournamentDetailsForm';

describe('TournamentDetailsForm', () => {
  const mockFormData = {
    name: 'Test Tournament',
    game: 'CS:GO',
    date: '2023-09-01',
    time: '14:00',
    venue: 'Cyber Arena',
    maxParticipants: '16',
    prizePool: '$1000',
    entryFee: 'Free',
    isOnline: false,
    description: 'Test description'
  };

  const mockInputChange = vi.fn();
  const mockCheckboxChange = vi.fn();

  beforeEach(() => {
    mockInputChange.mockClear();
    mockCheckboxChange.mockClear();
  });

  it('renders with the correct form values', () => {
    render(
      <TournamentDetailsForm
        formData={mockFormData}
        onInputChange={mockInputChange}
        onCheckboxChange={mockCheckboxChange}
      />
    );

    expect(screen.getByDisplayValue('$1000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Free')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    
    // Check the checkbox initial state
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('calls onInputChange when input values change', () => {
    render(
      <TournamentDetailsForm
        formData={mockFormData}
        onInputChange={mockInputChange}
        onCheckboxChange={mockCheckboxChange}
      />
    );

    const prizePoolInput = screen.getByDisplayValue('$1000');
    fireEvent.change(prizePoolInput, { target: { value: '$2000' } });
    
    expect(mockInputChange).toHaveBeenCalledTimes(1);
  });

  it('calls onCheckboxChange when checkbox state changes', () => {
    render(
      <TournamentDetailsForm
        formData={mockFormData}
        onInputChange={mockInputChange}
        onCheckboxChange={mockCheckboxChange}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(mockCheckboxChange).toHaveBeenCalledTimes(1);
  });

  it('handles textarea input correctly', () => {
    render(
      <TournamentDetailsForm
        formData={mockFormData}
        onInputChange={mockInputChange}
        onCheckboxChange={mockCheckboxChange}
      />
    );

    const textarea = screen.getByDisplayValue('Test description');
    fireEvent.change(textarea, { target: { value: 'New description text' } });
    
    expect(mockInputChange).toHaveBeenCalledTimes(1);
  });
});
