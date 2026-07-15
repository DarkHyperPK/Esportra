import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';

const { post, toast } = vi.hoisted(() => ({
  post: vi.fn(),
  toast: vi.fn(),
}));
const signOut = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signOut,
    },
  },
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: { post },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@/components/auth/AuthLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({});
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
    toast.mockReset();
    window.history.replaceState({}, '', '/auth/forgot-password');
  });

  it('requests recovery through the generic backend endpoint', async () => {
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
      expect(post).toHaveBeenCalledWith('/api/auth/recovery', {
        email: 'player@example.com',
        portal: 'main',
      });
    });

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });

    expect(await screen.findByText(/If an account exists/i)).toBeInTheDocument();
  });
});
