import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ScrimVetoSection } from '../ScrimVetoSection';

vi.mock('@/pages/tools/PublicMapVetoRoom', () => ({
  default: ({ token, embedded }: { token: string; embedded: boolean }) => (
    <div data-testid="veto-room" data-token={token} data-embedded={String(embedded)} />
  ),
}));

// Fake timers for the 5s transitional timeout
vi.useFakeTimers();

describe('ScrimVetoSection', () => {
  it('S2-0: renders nothing for non-eligible game', () => {
    const { container } = render(
      <ScrimVetoSection
        vetoSessionId={null}
        vetoMyToken={null}
        gameSlug="rocket-league"
        sessionStatus="in_progress"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('S2-1: renders nothing for eligible game not yet in_progress', () => {
    const { container } = render(
      <ScrimVetoSection
        vetoSessionId={null}
        vetoMyToken={null}
        gameSlug="valorant"
        sessionStatus="scheduled"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('S2-2: shows transitional spinner when in_progress and no veto ID', () => {
    render(
      <ScrimVetoSection
        vetoSessionId={null}
        vetoMyToken={null}
        gameSlug="valorant"
        sessionStatus="in_progress"
      />,
    );
    expect(screen.getByText(/setting up map veto/i)).toBeInTheDocument();
  });

  it('S2-5: shows unavailable notice after 5s without veto ID', () => {
    render(
      <ScrimVetoSection
        vetoSessionId={null}
        vetoMyToken={null}
        gameSlug="cs2"
        sessionStatus="in_progress"
      />,
    );
    act(() => vi.advanceTimersByTime(5_001));
    expect(screen.getByText(/map veto unavailable/i)).toBeInTheDocument();
  });

  it('S2-5: offers "Check again", which re-fetches instead of leaving a dead end', () => {
    const onRetry = vi.fn();
    render(
      <ScrimVetoSection
        vetoSessionId={null}
        vetoMyToken={null}
        gameSlug="cs2"
        sessionStatus="in_progress"
        onRetry={onRetry}
      />,
    );
    act(() => vi.advanceTimersByTime(5_001));
    fireEvent.click(screen.getByRole('button', { name: /check again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('S2-5: shows no retry button when the page gave no way to retry', () => {
    render(
      <ScrimVetoSection vetoSessionId={null} vetoMyToken={null} gameSlug="cs2" sessionStatus="in_progress" />,
    );
    act(() => vi.advanceTimersByTime(5_001));
    expect(screen.queryByRole('button', { name: /check again/i })).not.toBeInTheDocument();
  });

  it('swaps to the veto the moment the id arrives after the unavailable notice', () => {
    const { rerender } = render(
      <ScrimVetoSection vetoSessionId={null} vetoMyToken={null} gameSlug="cs2" sessionStatus="in_progress" />,
    );
    act(() => vi.advanceTimersByTime(5_001));
    expect(screen.getByText(/map veto unavailable/i)).toBeInTheDocument();
    rerender(
      <ScrimVetoSection vetoSessionId="v1" vetoMyToken="tok" gameSlug="cs2" sessionStatus="in_progress" />,
    );
    expect(screen.queryByText(/map veto unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle('Map veto')).not.toBeInTheDocument();
  });

  it('S2-3: shows a button that opens the veto room in a dialog', async () => {
    const { container } = render(
      <ScrimVetoSection
        vetoSessionId="veto-session-uuid"
        vetoMyToken="my-team-token-abc"
        gameSlug="valorant"
        sessionStatus="in_progress"
      />,
    );
    expect(screen.queryByTestId('veto-room')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open map veto' }));
    await act(async () => { await vi.dynamicImportSettled(); });
    const room = screen.getByTestId('veto-room');
    expect(room.getAttribute('data-token')).toBe('my-team-token-abc');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('S2-3: shows the Map veto eyebrow when ready', () => {
    render(
      <ScrimVetoSection
        vetoSessionId="veto-session-uuid"
        vetoMyToken="my-team-token-abc"
        gameSlug="valorant"
        sessionStatus="in_progress"
      />,
    );
    expect(screen.getByText('Map veto')).toBeInTheDocument();
  });
});
