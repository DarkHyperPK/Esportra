import { describe, expect, it } from 'vitest';
import { disputeReasonFor, liveStatus, nameKey, needsReview } from '@/services/scoreboardOcr/verification';
import type { OcrVerification, VerifiedPlayer } from '@/types/scoreboardOcr';

const player = (name: string, status: VerifiedPlayer['status'], extra: Partial<VerifiedPlayer> = {}): VerifiedPlayer => ({
  index: 0, name, team: 'team1', userId: null, status, source: null, readName: name, ...extra,
});

describe('screenshot report verification', () => {
  it('compares names like the API does', () => {
    expect(nameKey('L 1 t e')).toBe(nameKey('L1te'));
    expect(nameKey('ZyWoO')).toBe(nameKey('ZyWo0'));
    expect(nameKey('كبده وصدوقها')).toBe('كبدهوصدوقها');
  });

  it('flags only players that need a look', () => {
    const verification: OcrVerification = {
      players: [player('A', 'verified'), player('B', 'claimed'), player('C', 'unknown'), player('D', 'other_team')],
      flags: [],
    };
    expect(needsReview(verification).map((p) => p.name)).toEqual(['C', 'D']);
  });

  it('shows a renamed row as changed until the server re-checks it', () => {
    expect(liveStatus('L1te', player('L 1 t e', 'verified'))).toBe('verified');
    expect(liveStatus('Kaidn', player('Ringer', 'unknown'))).toBe('edited');
    expect(liveStatus('x', undefined)).toBeNull();
  });

  it('prefills a dispute reason', () => {
    const verification: OcrVerification = {
      players: [player('Ringer', 'unknown'), player('Rivers', 'other_team', { team: 'team1' }), player('Kaidn', 'edited', { readName: 'Kald' })],
      flags: ['screenshot_reused'],
    };
    const reason = disputeReasonFor(verification, { team1: 'Alpha', team2: 'Bravo' });
    expect(reason).toContain('Ringer (not on either roster)');
    expect(reason).toContain("Rivers (on Bravo's roster)");
    expect(reason).toContain('the screenshot showed "Kald"');
    expect(reason).toContain('used for another match');
    expect(disputeReasonFor(null, { team1: 'A', team2: 'B' })).toBe('');
  });
});
