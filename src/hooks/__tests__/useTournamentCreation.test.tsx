
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTournamentCreation } from '../useTournamentCreation';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../use-toast';

// Mock the hooks and services used
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn()
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' }
  }))
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockImplementation(() => Promise.resolve({
      data: [{ id: 'new-tournament' }],
      error: null
    }))
  }
}));

describe('useTournamentCreation', () => {
  const mockNavigate = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  it('initializes with default form values', () => {
    const { result } = renderHook(() => useTournamentCreation());
    
    expect(result.current.formData).toEqual({
      name: '',
      game: '',
      date: '',
      time: '',
      venue: '',
      maxParticipants: '',
      prizePool: '',
      description: '',
      entryFee: 'Free',
      isOnline: false,
    });
    
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('updates form data with handleInputChange', () => {
    const { result } = renderHook(() => useTournamentCreation());
    
    const mockEvent = {
      target: {
        name: 'name',
        value: 'New Tournament'
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    act(() => {
      result.current.handleInputChange(mockEvent);
    });
    
    expect(result.current.formData.name).toBe('New Tournament');
  });

  it('updates form data with handleSelectChange', () => {
    const { result } = renderHook(() => useTournamentCreation());
    
    act(() => {
      result.current.handleSelectChange('game', 'Valorant');
    });
    
    expect(result.current.formData.game).toBe('Valorant');
  });

  it('updates form data with handleCheckboxChange', () => {
    const { result } = renderHook(() => useTournamentCreation());
    
    const mockEvent = {
      target: {
        name: 'isOnline',
        checked: true
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    act(() => {
      result.current.handleCheckboxChange(mockEvent);
    });
    
    expect(result.current.formData.isOnline).toBe(true);
  });

  it('validates the form with missing fields', async () => {
    const { result } = renderHook(() => useTournamentCreation());
    
    const mockEvent = {
      preventDefault: vi.fn()
    } as unknown as React.FormEvent;
    
    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });
    
    expect(result.current.error).toBe("Please fill in all required fields");
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  // We would add more tests for the form submission but we'll keep it simple for now
});
