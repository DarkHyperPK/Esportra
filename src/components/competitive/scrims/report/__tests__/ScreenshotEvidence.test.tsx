import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScreenshotEvidence } from '../ScreenshotEvidence';

const games = vi.hoisted(() => ({ value: { isLoading: false, data: undefined as unknown } }));
vi.mock('@/hooks/competitive/useScrimGames', () => ({ useScrimGames: () => games.value }));
vi.mock('@/hooks/competitive/useScrims', () => ({ useScrimSession: () => ({ data: { team1Name: 'Player11', team2Name: 'Scytes' } }) }));
vi.mock('@/components/tournament/ocr-scoreboard/OcrMatchScoreboard', () => ({
  OcrMatchScoreboard: ({ players, team1Name }: { players: unknown[]; team1Name: string }) => <div data-testid="ocr">{`${team1Name} ${players.length}`}</div>,
}));

const game = (over: Record<string, unknown>) => ({ gameNumber: 2, team1Score: 4, team2Score: 13, screenshotUrls: [], matchData: null, ...over });

describe('ScreenshotEvidence', () => {
  it('shows the scoreboard read from the screenshot and the screenshot, opening full size', () => {
    games.value = { isLoading: false, data: { games: [game({ screenshotUrls: ['https://cdn/x.png'], matchData: { players: [{ name: 'a' }, { name: 'b' }] } })] } };
    render(<ScreenshotEvidence sessionId="s" gameNumber={2} mapName="Lotus" />);
    expect(screen.getByTestId('ocr')).toHaveTextContent('Player11 2');
    expect(screen.getByAltText('Scoreboard screenshot 1 for map 2').closest('a')).toHaveAttribute('href', 'https://cdn/x.png');
  });

  it('shows nothing extra when the map has no screenshot or scoreboard stored', () => {
    games.value = { isLoading: false, data: { games: [game({})] } };
    const { container } = render(<ScreenshotEvidence sessionId="s" gameNumber={2} mapName="Lotus" />);
    expect(screen.queryByTestId('ocr')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
