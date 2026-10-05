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

function renderWithDraft(customDraft: OcrDraft, onPlayerChange = vi.fn()) {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Report</DialogTitle>
        <ScoreboardOcrReview draft={customDraft} teamNames={{ team1: 'Alpha', team2: 'Bravo' }} agents={agents} errors={[]} submitting={false}
          onScoreChange={vi.fn()} onPlayerChange={onPlayerChange} onSubmit={vi.fn()} onManual={vi.fn()} />
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

  it('shows no elimination or low-confidence UI for all-confident read rows', () => {
    renderInDialog();
    expect(screen.queryByText(/not readable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/check name/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/matched by elimination/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle('Confirm all guessed names first')).not.toBeInTheDocument();
  });
});

describe('elimination-matched rows', () => {
  const eliminationPlayer: OcrDraftPlayer = {
    key: 'row-0', team: 'team1', name: 'GuessedPlayer', userId: 'u1',
    agentId: null, agentName: 'Jett', stats: { kills: 10, deaths: 5, assists: 3 },
    uncertain: [], rosterMatchMethod: 'elimination', nameConfidence: 0.1,
  };
  const cleanPlayer: OcrDraftPlayer = {
    key: 'row-1', team: 'team2', name: 'KnownPlayer', userId: 'u2',
    agentId: null, agentName: 'Sova', stats: { kills: 8, deaths: 7, assists: 2 },
    uncertain: [], rosterMatchMethod: 'read', nameConfidence: 0.95,
  };
  const eliminationDraft: OcrDraft = {
    parseId: 'p', screenshotUrl: 'https://cdn/s.png', mapId: null, mapName: 'Sunset', mapUrl: null,
    team1Score: 13, team2Score: 9, uncertainScore: false, columns: ['kills', 'deaths', 'assists'],
    players: [eliminationPlayer, cleanPlayer], warnings: [],
  };

  it('shows NOT READABLE tag and confirmation hint for unconfirmed elimination rows', () => {
    renderWithDraft(eliminationDraft);
    expect(screen.getByText(/not readable/i)).toBeVisible();
    expect(screen.getByText(/matched by elimination/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /confirm GuessedPlayer is correct/i })).toBeVisible();
  });

  it('blocks submit with InlineNotice and disabled button when elimination row is unconfirmed', () => {
    renderWithDraft(eliminationDraft);
    expect(screen.getByText(/1 name couldn't be read/i)).toBeVisible();
    const submitBtn = screen.getByRole('button', { name: /send to opponent/i });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute('title', 'Confirm all guessed names first');
  });

  it('clears rose indicators and enables submit after clicking confirm', () => {
    renderWithDraft(eliminationDraft);
    fireEvent.click(screen.getByRole('button', { name: /confirm GuessedPlayer is correct/i }));
    expect(screen.queryByText(/not readable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/matched by elimination/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/couldn't be read/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send to opponent/i })).not.toBeDisabled();
  });

  it('clears rose indicators when the name input is edited', () => {
    const onPlayerChange = renderWithDraft(eliminationDraft);
    const nameInput = screen.getByRole('textbox', { name: /player 1 name/i });
    fireEvent.change(nameInput, { target: { value: 'CorrectedName' } });
    expect(onPlayerChange).toHaveBeenCalledWith('row-0', { name: 'CorrectedName' });
    expect(screen.queryByText(/not readable/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send to opponent/i })).not.toBeDisabled();
  });

  it('does not block submit for a clean row without elimination method', () => {
    const cleanDraft: OcrDraft = { ...eliminationDraft, players: [cleanPlayer] };
    renderWithDraft(cleanDraft);
    expect(screen.queryByText(/couldn't be read/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send to opponent/i })).not.toBeDisabled();
  });
});

describe('low-confidence read rows', () => {
  const lowConfPlayer: OcrDraftPlayer = {
    key: 'row-0', team: 'team1', name: 'FuzzyName', userId: null,
    agentId: null, agentName: 'Jett', stats: { kills: 5, deaths: 5, assists: 5 },
    uncertain: [], rosterMatchMethod: 'read', nameConfidence: 0.65,
  };
  const lowConfDraft: OcrDraft = {
    parseId: 'p', screenshotUrl: 'https://cdn/s.png', mapId: null, mapName: 'Sunset', mapUrl: null,
    team1Score: 13, team2Score: 9, uncertainScore: false, columns: ['kills', 'deaths', 'assists'],
    players: [lowConfPlayer], warnings: [],
  };

  it('shows CHECK NAME zinc tag for low-confidence read rows', () => {
    renderWithDraft(lowConfDraft);
    expect(screen.getByText(/check name/i)).toBeVisible();
  });

  it('does NOT block submit for low-confidence read rows', () => {
    renderWithDraft(lowConfDraft);
    expect(screen.queryByText(/couldn't be read/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send to opponent/i })).not.toBeDisabled();
  });

  it('does NOT show CHECK NAME on elimination rows (mutually exclusive)', () => {
    const eliminationPlayer: OcrDraftPlayer = {
      key: 'row-0', team: 'team1', name: 'EliminatedPlayer', userId: 'u1',
      agentId: null, agentName: 'Jett', stats: { kills: 5, deaths: 5, assists: 5 },
      uncertain: [], rosterMatchMethod: 'elimination', nameConfidence: 0.1,
    };
    const mixedDraft: OcrDraft = { ...lowConfDraft, players: [eliminationPlayer] };
    renderWithDraft(mixedDraft);
    expect(screen.queryByText(/check name/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not readable/i)).toBeVisible();
  });
});
