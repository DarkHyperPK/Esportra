import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictCard } from '../ConflictCard';

// Framer Motion doesn't animate in jsdom; its variants still render children.
vi.mock('framer-motion', async (importOriginal) => {
  const mod = await importOriginal<typeof import('framer-motion')>();
  return {
    ...mod,
    motion: {
      ...mod.motion,
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const baseProps = {
  matchCode: 'MAIN',
  mapNumber: 2,
  submittedA: 13,
  submittedB: 7,
  gepA: 13,
  gepB: 8,
  isResolving: false,
  onUseGep: vi.fn(),
  onKeepSubmitted: vi.fn(),
};

describe('ConflictCard', () => {
  it('renders both submitted and GEP scores', () => {
    render(<ConflictCard {...baseProps} />);
    // Submitted column
    expect(screen.getAllByText('13').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    // GEP column
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the map label', () => {
    render(<ConflictCard {...baseProps} />);
    expect(screen.getByText('Map 2 · MAIN')).toBeInTheDocument();
  });

  it('calls onUseGep when the primary button is clicked', () => {
    const onUseGep = vi.fn();
    render(<ConflictCard {...baseProps} onUseGep={onUseGep} />);
    fireEvent.click(screen.getByRole('button', { name: /use gep score/i }));
    expect(onUseGep).toHaveBeenCalledTimes(1);
  });

  it('calls onKeepSubmitted when the secondary button is clicked', () => {
    const onKeepSubmitted = vi.fn();
    render(<ConflictCard {...baseProps} onKeepSubmitted={onKeepSubmitted} />);
    fireEvent.click(screen.getByRole('button', { name: /keep submitted/i }));
    expect(onKeepSubmitted).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons when isResolving is true', () => {
    render(<ConflictCard {...baseProps} isResolving />);
    expect(screen.getByRole('button', { name: /keep submitted/i })).toBeDisabled();
    // Primary button shows spinner — no text match, query by role
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('shows "Score confirmed." and hides action buttons when resolved', () => {
    render(<ConflictCard {...baseProps} resolved />);
    expect(screen.getByText('Score confirmed.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /use gep/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /keep submitted/i })).not.toBeInTheDocument();
  });

  it('shows resolveError message when provided', () => {
    render(<ConflictCard {...baseProps} resolveError="Cannot resolve: session ID not available." />);
    expect(screen.getByText(/cannot resolve/i)).toBeInTheDocument();
  });

  it('has role="alert" on the wrapper', () => {
    render(<ConflictCard {...baseProps} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('omits match code from label when matchCode is null', () => {
    render(<ConflictCard {...baseProps} matchCode={null} />);
    expect(screen.getByText('Map 2')).toBeInTheDocument();
    expect(screen.queryByText(/MAIN/)).not.toBeInTheDocument();
  });
});
