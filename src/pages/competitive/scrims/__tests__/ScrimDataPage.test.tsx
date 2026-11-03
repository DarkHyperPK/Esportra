import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScrimDataPage from '../ScrimDataPage';

const mocks = vi.hoisted(() => ({ teams: vi.fn() }));
vi.mock('@/hooks/useNavTeamStatus', () => ({ useMyTeamsSummary: mocks.teams }));
vi.mock('@/components/competitive/CompetitivePageShell', () => ({ CompetitivePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/competitive/scrims/data/ScrimDataPanel', () => ({ ScrimDataPanel: ({ teamId }: { teamId: string }) => <p data-testid="panel">{teamId}</p> }));

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><ScrimDataPage /></MemoryRouter>);

beforeEach(() => mocks.teams.mockReset());

describe('ScrimDataPage', () => {
  it('explains that only the team can see this', () => {
    mocks.teams.mockReturnValue({ data: [{ id: 't1', name: 'Alpha' }], isLoading: false });
    renderAt('/competitive/scrims/data');
    expect(screen.getByRole('heading', { name: 'Your scrims data' })).toBeInTheDocument();
    expect(screen.getByText(/Only your team can see this/)).toBeInTheDocument();
    expect(screen.getByTestId('panel')).toHaveTextContent('t1');
  });

  it('lets a member of several teams switch, and honours the team in the link', () => {
    mocks.teams.mockReturnValue({ data: [{ id: 't1', name: 'Alpha' }, { id: 't2', name: 'Bravo' }], isLoading: false });
    renderAt('/competitive/scrims/data?team_id=t2');
    expect(screen.getByTestId('panel')).toHaveTextContent('t2');
    expect(screen.getByRole('link', { name: 'Bravo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', '/competitive/scrims/data?team_id=t1');
  });

  it('asks someone without a team to join one instead of showing a blank page', () => {
    mocks.teams.mockReturnValue({ data: [], isLoading: false });
    renderAt('/competitive/scrims/data');
    expect(screen.getByText('Join or create a team to see your scrim data.')).toBeInTheDocument();
    expect(screen.queryByTestId('panel')).toBeNull();
  });
});
