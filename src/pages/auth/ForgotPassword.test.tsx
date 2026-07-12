import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';

const { resetPasswordForEmail, toast } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail,
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@/components/auth/AuthLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    resetPasswordForEmail.mockResolvedValue({ error: null });
    toast.mockReset();
    window.history.replaceState({}, '', '/auth/forgot-password');
  });

  it('sends recovery links directly to the reset password route', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'player@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith('player@example.com', {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    });

    expect(resetPasswordForEmail).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/callback'),
      }),
    );
  });
});
