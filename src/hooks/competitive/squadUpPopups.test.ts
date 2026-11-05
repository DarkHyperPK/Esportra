import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { squadUpKeys } from './queryKeys';
import {
  announceSquadUpLike, announceSquadUpMatch, announceSquadUpMatchFromNotification, dismissSquadUpMatch, type MatchPopup, type SquadUpPopupState,
} from './squadUpPopups';

const popup = (overrides: Partial<MatchPopup> = {}): MatchPopup => ({
  matchId: 'm1', conversationId: 'c1', title: "It's a match!", message: 'msg', sessionEnded: false, details: null, ...overrides,
});
const state = (qc: QueryClient) => qc.getQueryData<SquadUpPopupState>(squadUpKeys.popup())!;

describe('Squad Up popups', () => {
  it('shows a match once even when the response and the push both announce it', () => {
    const qc = new QueryClient();
    announceSquadUpMatch(qc, popup());
    announceSquadUpMatch(qc, popup());
    expect(state(qc).shownMatchIds).toEqual(['m1']);
    dismissSquadUpMatch(qc);
    announceSquadUpMatch(qc, popup());
    expect(state(qc).match).toBeNull();
  });

  it('upgrades an open popup with full details and the session-ended flag', () => {
    const qc = new QueryClient();
    announceSquadUpMatch(qc, popup());
    const details = { matchId: 'm1', matchedUserId: 'u', matchedUsername: 'Ace', matchedAt: 'now' };
    announceSquadUpMatch(qc, popup({ details, sessionEnded: true }));
    expect(state(qc).match).toMatchObject({ details, sessionEnded: true });
  });

  it('reads ids from a persisted notification and ignores one without a match id', () => {
    const qc = new QueryClient();
    announceSquadUpMatchFromNotification(qc, { title: 'T', message: 'M', data: {} });
    expect(state(qc)).toBeUndefined();
    announceSquadUpMatchFromNotification(qc, { title: 'T', message: 'M', data: { match_id: 'm2', conversation_id: 'c2', session_ended: true } });
    expect(state(qc).match).toMatchObject({ matchId: 'm2', conversationId: 'c2', sessionEnded: true });
  });

  it('keeps a liked-you count without touching a match popup', () => {
    const qc = new QueryClient();
    announceSquadUpMatch(qc, popup());
    announceSquadUpLike(qc, 3);
    expect(state(qc)).toMatchObject({ like: { count: 3 }, match: { matchId: 'm1' } });
  });
});
