import { describe, expect, it } from 'vitest';
import { getCheckinForfeitDisplay } from './matchForfeitDisplay';

describe('getCheckinForfeitDisplay', () => {
  it('returns double forfeit copy', () => {
    const display = getCheckinForfeitDisplay({
      matchOutcome: 'double_forfeit',
      forfeitReason: 'neither_checked_in',
      userTeamId: 'team-1',
      team1Id: 'team-1',
      team2Id: 'team-2',
    });

    expect(display).toEqual({
      title: 'Match Forfeited',
      description: 'Neither team checked in before the check-in deadline.',
      tone: 'forfeit',
    });
  });

  it('returns walkover win for checked-in captain', () => {
    const display = getCheckinForfeitDisplay({
      matchOutcome: 'walkover',
      forfeitReason: 'team2_not_checked_in',
      userTeamId: 'team-1',
      team1Id: 'team-1',
      team2Id: 'team-2',
    });

    expect(display?.tone).toBe('walkover_win');
    expect(display?.title).toBe('Walkover Win');
  });

  it('returns forfeited copy for missed team', () => {
    const display = getCheckinForfeitDisplay({
      matchOutcome: 'walkover',
      forfeitReason: 'team2_not_checked_in',
      userTeamId: 'team-2',
      team1Id: 'team-1',
      team2Id: 'team-2',
    });

    expect(display?.tone).toBe('forfeit');
    expect(display?.description).toContain('Your team did not check in');
  });
});
