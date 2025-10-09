
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TournamentBasicInfoForm from '../TournamentBasicInfoForm';

// Mock the Select component from shadcn
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="mock-select" data-value={value}>
      {children}
      <select onChange={(e) => onValueChange(e.target.value)}>
        <option value="CS:GO">CS:GO</option>
        <option value="League of Legends">League of Legends</option>
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <option value={value} data-testid={`select-item-${value}`}>{children}</option>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
}));

describe('TournamentBasicInfoForm', () => {
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
  const mockSelectChange = vi.fn();

  beforeEach(() => {
    mockInputChange.mockClear();
    mockSelectChange.mockClear();
  });

  it('renders with the correct form values', () => {
    render(
      <TournamentBasicInfoForm
        formData={mockFormData}
        onInputChange={mockInputChange}
        onSelectChange={mockSelectChange}
      />
    );

    expect(screen.getByDisplayValue('Test Tournament')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2023-09-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('14:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('16')).toBeInTheDocument();

    // Check if the select components received the correct values
    expect(screen.getByTestId('mock-select')).toHaveAttribute('data-value', 'CS:GO');
  });

  it('calls onInputChange when input values change', () => {
    render(
      <TournamentBasicInfoForm
        formData={mockFormData}
        onInputChange={mockInputChange}
        onSelectChange={mockSelectChange}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Tournament');
    fireEvent.change(nameInput, { target: { value: 'New Tournament Name' } });
    
    expect(mockInputChange).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectChange when select values change', () => {
    render(
      <TournamentBasicInfoForm
        formData={mockFormData}
        onInputChange={mockInputChange}
        onSelectChange={mockSelectChange}
      />
    );

    const selectComponent = screen.getByTestId('mock-select').querySelector('select');
    if (selectComponent) {
      fireEvent.change(selectComponent, { target: { value: 'League of Legends' } });
      expect(mockSelectChange).toHaveBeenCalledWith('game', 'League of Legends');
    }
  });
});
