import type { ReactNode } from 'react';
import type { StandingsRow } from '@/types/standings';
import { Diff, FormGuide, RankCell, TeamCell } from './StandingsCells';

export interface StandingsColumn {
  /** Short header shown in the table. */
  label: string;
  /** Full name for screen readers and the hover title. */
  title: string;
  align: 'left' | 'center';
  render: (row: StandingsRow) => ReactNode;
}

export function buildColumns(isFinal: boolean): Record<string, StandingsColumn> {
  return {
    rank: { label: '#', title: 'Rank', align: 'left', render: (r) => <RankCell row={r} isFinal={isFinal} /> },
    team: { label: 'Team', title: 'Team', align: 'left', render: (r) => <TeamCell row={r} /> },
    bracket_side: {
      label: 'Bracket', title: 'Bracket side', align: 'left',
      render: (r) => (r.bracket_side === 'winners' ? 'Upper' : r.bracket_side === 'losers' ? 'Lower' : '–'),
    },
    played: { label: 'P', title: 'Played', align: 'center', render: (r) => r.played },
    wins: { label: 'W', title: 'Wins', align: 'center', render: (r) => <span className="text-white">{r.wins}</span> },
    losses: { label: 'L', title: 'Losses', align: 'center', render: (r) => <span className="text-zinc-400">{r.losses}</span> },
    ties: { label: 'D', title: 'Draws', align: 'center', render: (r) => r.ties },
    points: { label: 'Pts', title: 'Points', align: 'center', render: (r) => <span className="font-semibold text-white">{r.points}</span> },
    score_diff: { label: 'Map ±', title: 'Map difference', align: 'center', render: (r) => <Diff value={r.score_diff} /> },
    round_diff: { label: 'Rnd ±', title: 'Round difference', align: 'center', render: (r) => <Diff value={r.round_diff} /> },
    buchholz: { label: 'Buch.', title: 'Buchholz (opponent strength)', align: 'center', render: (r) => r.buchholz },
    round_results: { label: 'Form', title: 'Results by round', align: 'left', render: (r) => <FormGuide results={r.round_results} /> },
    kills: { label: 'Kills', title: 'Kills', align: 'center', render: (r) => r.kills },
  };
}
