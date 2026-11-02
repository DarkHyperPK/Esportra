import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UpNextStrip } from '../UpNextStrip';
import type { ScrimUpNextItem } from '@/types/competitive';

const base: ScrimUpNextItem = {
  type: 'result_to_confirm',
  teamId: 't1',
  sessionId: 's1',
  offerId: null,
  listingId: null,
  opponentName: 'Nova',
  opponentLogo: null,
  gameSlug: 'valorant',
  scheduledAt: null,
  deadline: null,
};

const renderStrip = (props: Partial<React.ComponentProps<typeof UpNextStrip>> = {}) =>
  render(
    <MemoryRouter>
      <UpNextStrip lead={base} more={0} {...props} />
    </MemoryRouter>,
  );

describe('UpNextStrip', () => {
  it('renders nothing when there is no lead item', () => {
    const { container } = renderStrip({ lead: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows what happened and links to the room with the right action', () => {
    renderStrip();
    expect(screen.getByRole('heading', { name: /Nova reported the result/i })).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Review result/i });
    expect(cta).toHaveAttribute('href', '/competitive/scrims/sessions/s1');
  });

  it('says how many more are waiting and links to the workspace', () => {
    renderStrip({ more: 3 });
    expect(screen.getByText(/3 more waiting/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See all/i })).toHaveAttribute('href', '/competitive/scrims/workspace');
  });

  it('shows a live countdown only for check-in', () => {
    const soon = new Date(Date.now() + 10 * 60_000).toISOString();
    renderStrip({ lead: { ...base, type: 'checkin_open', deadline: soon } });
    expect(screen.getByRole('link', { name: /Check in/i })).toBeInTheDocument();
    expect(screen.getByText(/\d+m/)).toBeInTheDocument();
  });

  it('does not call the refresh callback when nothing has expired', () => {
    const onDeadlinePassed = vi.fn();
    renderStrip({ onDeadlinePassed });
    expect(onDeadlinePassed).not.toHaveBeenCalled();
  });
});
