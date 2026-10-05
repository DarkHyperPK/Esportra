import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { OcrDraft, OcrDraftPlayer, OcrVerification } from '@/types/scoreboardOcr';
import { ScoreboardOcrReview } from '../ScoreboardOcrReview';

vi.mock('@/components/ui/EntityAvatar', () => ({ default: ({ name }: { name?: string }) => <span>{name}</span> }));

const row = (i: number, name: string, team: 'team1' | 'team2'): OcrDraftPlayer => ({
  key: `row-${i}`, team, name, userId: null, agentId: null, agentName: 'Jett', stats: { kills: 10, deaths: 5, assists: 3 }, uncertain: [],
});
const draft: OcrDraft = {
  parseId: 'p', screenshotUrl: 'https://cdn/s.png', mapId: null, mapName: 'Sunset', mapUrl: null, team1Score: 15, team2Score: 13,
  uncertainScore: false, columns: ['kills', 'deaths', 'assists'], players: [row(0, 'Ringer', 'team1'), row(1, 'Rivers', 'team1'), row(2, 'Known', 'team2')], warnings: [],
};
const verification: OcrVerification = {
  players: [
    { index: 0, name: 'Ringer', team: 'team1', userId: null, status: 'unknown', source: null, readName: 'Ringer' },
    { index: 1, name: 'Rivers', team: 'team1', userId: null, status: 'other_team', source: null, readName: 'Rivers' },
    { index: 2, name: 'Known', team: 'team2', userId: 'u', status: 'verified', source: null, readName: 'Known' },
  ],
  flags: [],
};
const agents = [
  { uuid: 'jett', name: 'Jett', icon: null },
  { uuid: 'sova', name: 'Sova', icon: null },
];

function renderInDialog(onPlayerChange = vi.fn()) {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Report</DialogTitle>
        <ScoreboardOcrReview draft={draft} teamNames={{ team1: 'Alpha', team2: 'Bravo' }} agents={agents} errors={[]} submitting={false}
          verification={verification} onScoreChange={vi.fn()} onPlayerChange={onPlayerChange} onSubmit={vi.fn()} onManual={vi.fn()} />
      </DialogContent>
    </Dialog>,
  );
  return onPlayerChange;
}

describe('screenshot review', () => {
  it('shows why a name needs a look on the row and in the summary, without hovering', () => {
    renderInDialog();
    expect(screen.getByText('Not on roster')).toBeVisible();
    expect(screen.getByText("On Bravo's roster")).toBeVisible();
    expect(screen.getByText(/1 name isn't on either team's roster/)).toBeVisible();
    expect(screen.getByText(/1 player is on the other team's roster/)).toBeVisible();
    expect(screen.queryByText(/Tap the icon/)).toBeNull();
  });

  it('lets the captain change an agent from inside the report dialog', () => {
    const onPlayerChange = renderInDialog();
    fireEvent.click(screen.getByRole('button', { name: /Ringer agent: Jett/ }));
    const grid = screen.getByRole('listbox', { name: 'Agent for Ringer' });
    expect(grid.closest('[data-radix-popper-content-wrapper] > *')?.className).toContain('z-[1002]');
    fireEvent.click(within(grid).getByRole('option', { name: 'Sova' }));
    expect(onPlayerChange).toHaveBeenCalledWith('row-0', { agentId: 'sova', agentName: 'Sova' });
  });
});
