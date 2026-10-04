import { describe, expect, it } from 'vitest';
import { badgeFor, disputeReasonFor, liveStatus, nameKey, needsReview, riotCheckSummary } from '@/services/scoreboardOcr/verification';
import { ocrVerificationSchema } from '@/schemas/scoreboardOcrSchema';
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

  it('never calls a name-only match verified: the #tag is not on the scoreboard', () => {
    expect(badgeFor({ status: 'verified' })).toMatchObject({ label: 'Name matches Riot ID', tone: 'neutral' });
    expect(badgeFor({ status: 'verified' }).hint).toContain('#tag');
    expect(badgeFor({ status: 'verified', riotStatus: 'confirmed' })).toMatchObject({ label: 'Riot ID confirmed', tone: 'good' });
    expect(badgeFor({ status: 'verified', riotStatus: 'other_account' })).toMatchObject({ label: 'Different Riot account', tone: 'check' });
  });

  it("puts Riot's findings up for review and into the dispute", () => {
    const verification: OcrVerification = {
      players: [
        player('DarkHyper', 'verified', { riotStatus: 'confirmed', riotId: 'DarkHyper#007', riotKda: '19/18/7' }),
        player('Saintt', 'verified', { riotStatus: 'other_account', riotId: 'Saintt#999' }),
        player('ghastii', 'unknown', { riotStatus: 'unregistered', riotId: 'ghastii#EUW' }),
      ],
      flags: ['stats_mismatch', 'score_mismatch'],
      riot: { status: 'confirmed', matchId: 'riot-1' },
    };
    expect(needsReview(verification).map((p) => p.name)).toEqual(['Saintt', 'ghastii']);
    const reason = disputeReasonFor(verification, { team1: 'Alpha', team2: 'Bravo' });
    expect(reason).toContain('a different Riot account played: Saintt#999');
    expect(reason).toContain('ghastii#EUW (not linked to either roster)');
    expect(reason).toContain('DarkHyper (Riot: 19/18/7)');
    expect(reason).toContain('score differs');
  });

  it('says where the Riot check stands', () => {
    expect(riotCheckSummary({ status: 'pending' })?.text).toContain('Looking for this game');
    expect(riotCheckSummary({ status: 'not_found' })?.text).toContain('screenshot only');
    expect(riotCheckSummary(null)).toBeNull();
  });

  it('reads stored checks, dropping flags it does not know', () => {
    const parsed = ocrVerificationSchema.parse({
      players: [{ index: 0, name: 'A', team: 'team1', userId: 'u', status: 'verified', source: null, readName: 'A', riotStatus: 'confirmed', riotId: 'A#1' }],
      flags: ['stats_mismatch', 'something_new'],
      riot: { status: 'confirmed', matchId: 'm', checkedAt: '2026-10-04T20:00:00Z' },
    });
    expect(parsed.flags).toEqual(['stats_mismatch']);
    expect(parsed.players[0].riotId).toBe('A#1');
    expect(parsed.riot?.status).toBe('confirmed');
  });
});
