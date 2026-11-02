import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MatchDataStatusBadge } from '../MatchDataStatusBadge';

describe('MatchDataStatusBadge', () => {
  it('renders nothing when there is no Riot match', () => {
    const { container } = render(<MatchDataStatusBadge detail={{ status: 'none', reasons: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('states the result and what it means in words', () => {
    render(<MatchDataStatusBadge detail={{ status: 'verified', reasons: [], players: [{ isRosterMember: true }] }} />);
    expect(screen.getByText('Verified by Riot')).toBeInTheDocument();
    expect(screen.getByText(/agrees with the reported result/)).toBeInTheDocument();
  });

  it('lists why a result differs, never raw codes', () => {
    render(<MatchDataStatusBadge detail={{ status: 'disputed', reasons: ['team1_score_mismatch', 'brand_new_code'] }} />);
    expect(screen.getByText(/first team’s score does not match/)).toBeInTheDocument();
    expect(screen.getByText('One of the checks did not pass.')).toBeInTheDocument();
    expect(screen.queryByText(/brand_new_code/)).toBeNull();
  });

  it('compact mode shows the pill alone', () => {
    render(<MatchDataStatusBadge compact detail={{ status: 'partially_verified', reasons: ['unmatched_players:1'] }} />);
    expect(screen.getByText('Partly verified')).toBeInTheDocument();
    expect(screen.queryByText(/could not be matched/)).toBeNull();
  });
});
