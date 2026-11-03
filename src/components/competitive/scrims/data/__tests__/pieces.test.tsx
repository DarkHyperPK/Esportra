import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CoverageSummary } from '../CoverageSummary';
import { RecentMapsPanel } from '../RecentMapsPanel';
import { TierBadge } from '../TierBadge';

describe('TierBadge', () => {
  it('names each tier in words', () => {
    const { rerender } = render(<TierBadge tier="full" />);
    expect(screen.getByText('Full data')).toBeInTheDocument();
    rerender(<TierBadge tier="screenshot" />);
    expect(screen.getByText('Screenshot')).toBeInTheDocument();
    rerender(<TierBadge tier="score_only" />);
    expect(screen.getByText('Score only')).toBeInTheDocument();
  });
});

describe('CoverageSummary', () => {
  it('counts each tier and says what it contains', () => {
    render(<CoverageSummary coverage={{ maps: 6, full: 3, screenshot: 2, scoreOnly: 1, riotPending: 0, riotNotVerified: 0, awaitingConfirmation: 0, disputed: 0, queueGames: 0 }} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/every player, every round/)).toBeInTheDocument();
    expect(screen.getByText(/no round-by-round detail/)).toBeInTheDocument();
    expect(screen.getByText(/Only the result and the map/)).toBeInTheDocument();
  });

  it('draws no bar when there are no maps', () => {
    const { container } = render(<CoverageSummary coverage={{ maps: 0, full: 0, screenshot: 0, scoreOnly: 0, riotPending: 0, riotNotVerified: 0, awaitingConfirmation: 0, disputed: 0, queueGames: 0 }} />);
    expect(container.querySelector('[aria-hidden]')).toBeNull();
  });
});

describe('RecentMapsPanel', () => {
  it('lists maps with their tier, score and a link to the scrim', () => {
    render(
      <MemoryRouter>
        <RecentMapsPanel maps={[{ sessionId: 's9', gameNumber: 2, playedAt: '2026-10-03T00:00:00Z', map: null, opponent: null, result: 'loss', roundsWon: null, roundsLost: null, tier: 'score_only' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Map not recorded')).toBeInTheDocument();
    expect(screen.getByText('Score only')).toBeInTheDocument();
    expect(screen.getByText('Loss')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/competitive/scrims/sessions/s9');
  });

  it('renders nothing without maps', () => {
    const { container } = render(<MemoryRouter><RecentMapsPanel maps={[]} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
