import { describe, expect, it } from 'vitest';
import { buildGameTabs, defaultGameTab } from '../scrimGameTabs';
import type { ScrimGame, ScrimGameStatus } from '@/types/competitive';

const game = (gameNumber: number, status: ScrimGameStatus, winnerSlot: 1 | 2 | null = 1): ScrimGame => ({
  gameNumber, status, mapName: null, mapId: null, team1Score: 13, team2Score: 5, winnerSlot, source: 'manual',
  riotMatchId: null, matchData: null, screenshotUrls: [], notes: null, reportedByTeamId: 't1', reportedAt: '',
  confirmedByTeamId: null, confirmedAt: null, disputedByTeamId: null, acceptBy: null, autoConfirmed: false,
});

describe('buildGameTabs', () => {
  it('makes one tab per map of the format', () => {
    expect(buildGameTabs(3, [], false)).toHaveLength(3);
    expect(buildGameTabs(1, [], false)).toHaveLength(1);
    expect(buildGameTabs(5, [], false)).toHaveLength(5);
  });

  it('opens only game 1 at the start', () => {
    const tabs = buildGameTabs(3, [], false);
    expect(tabs.map((t) => t.unlocked)).toEqual([true, false, false]);
    expect(tabs[1].lockedReason).toBe('Finish game 1 first.');
  });

  it('keeps the next map locked while the previous one awaits confirmation', () => {
    const tabs = buildGameTabs(3, [game(1, 'reported')], false);
    expect(tabs[1].unlocked).toBe(false);
  });

  it('opens the next map once the previous is confirmed or disputed', () => {
    expect(buildGameTabs(3, [game(1, 'confirmed')], false)[1].unlocked).toBe(true);
    expect(buildGameTabs(3, [game(1, 'disputed', null)], false)[1].unlocked).toBe(true);
  });

  it('marks maps the decided series no longer needs', () => {
    const tabs = buildGameTabs(3, [game(1, 'confirmed'), game(2, 'confirmed')], true);
    expect(tabs[2]).toMatchObject({ unlocked: false, notNeeded: true });
  });

  it('adds a replay tab for a voided map', () => {
    expect(buildGameTabs(3, [game(1, 'resolved', null)], false)).toHaveLength(4);
  });
});

describe('defaultGameTab', () => {
  it('opens the map being played', () => {
    const tabs = buildGameTabs(3, [game(1, 'confirmed')], false);
    expect(defaultGameTab(tabs, 2)).toBe(2);
  });

  it('falls back to the last reported map when the series is over', () => {
    const tabs = buildGameTabs(3, [game(1, 'confirmed'), game(2, 'confirmed')], true);
    expect(defaultGameTab(tabs, null)).toBe(2);
  });
});
