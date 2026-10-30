import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ScrimVetoSection } from '../ScrimVetoSection';

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

  it('S2-3: renders iframe with correct URL when veto is ready', () => {
    render(
      <ScrimVetoSection
        vetoSessionId="veto-session-uuid"
        vetoMyToken="my-team-token-abc"
        gameSlug="valorant"
        sessionStatus="in_progress"
      />,
    );
    const iframe = screen.getByTitle('Map veto') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain('/tools/map-veto/team/my-team-token-abc');
    // UX risk 3: scrolling must be "no"
    expect(iframe.getAttribute('scrolling')).toBe('no');
  });

  it('S2-3: shows MAP VETO eyebrow when iframe is active', () => {
    render(
      <ScrimVetoSection
        vetoSessionId="veto-session-uuid"
        vetoMyToken="my-team-token-abc"
        gameSlug="valorant"
        sessionStatus="in_progress"
      />,
    );
    expect(screen.getByText('MAP VETO')).toBeInTheDocument();
  });
});
