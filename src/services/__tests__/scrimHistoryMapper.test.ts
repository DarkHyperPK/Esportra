import { describe, expect, it } from 'vitest';
import { toHistoryPage, type RawHistoryPage, type RawHistoryRow } from '../scrimHistoryMapper';

// What GET /api/scrims/teams/{id}/history sends, after the client camel-cases it.
const raw = (over: Partial<RawHistoryRow> = {}): RawHistoryRow => ({
  id: 's1',
  scheduledAt: '2026-11-01T20:00:00Z',
  gameSlug: 'valorant',
  team1Id: 'me',
  team1Name: 'Apex',
  team2Id: 'them',
  team2Name: 'Nova',
  team1Score: 2,
  team2Score: 1,
  result: null,
  mapName: 'Ascent',
  completedAt: '2026-11-01T21:00:00Z',
  ...over,
});
const page = (items: RawHistoryRow[], over: Partial<RawHistoryPage> = {}): RawHistoryPage => ({ items, total: items.length, page: 1, pageSize: 20, ...over });

describe('toHistoryPage', () => {
  it('turns the raw rows into entries from the viewed team\'s side', () => {
    const { items } = toHistoryPage(page([raw()]), 'me');
    expect(items[0]).toMatchObject({
      sessionId: 's1',
      opponentTeamId: 'them',
      opponentTeamName: 'Nova',
      myScore: 2,
      opponentScore: 1,
      mapName: 'Ascent',
      gameSlug: 'valorant',
    });
  });

  it('flips sides when the viewed team is team 2', () => {
    const { items } = toHistoryPage(page([raw()]), 'them');
    expect(items[0]).toMatchObject({ opponentTeamId: 'me', opponentTeamName: 'Apex', myScore: 1, opponentScore: 2 });
  });

  it('derives the result from the score when the server hides it from non-members', () => {
    const win = toHistoryPage(page([raw({ result: null })]), 'me').items[0].result;
    const loss = toHistoryPage(page([raw({ result: null })]), 'them').items[0].result;
    const draw = toHistoryPage(page([raw({ team2Score: 2, result: null })]), 'me').items[0].result;
    expect([win, loss, draw]).toEqual(['win', 'loss', 'draw']);
  });

  it('trusts the server result when it sends one', () => {
    expect(toHistoryPage(page([raw({ result: 'loss' })]), 'me').items[0].result).toBe('loss');
  });

  it('drops rows it cannot score instead of inventing a result', () => {
    const out = toHistoryPage(page([raw({ team1Score: null }), raw({ id: 's2' })]), 'me');
    expect(out.items.map((i) => i.sessionId)).toEqual(['s2']);
  });

  it('marks the page public: the endpoint refuses private history outright', () => {
    expect(toHistoryPage(page([raw()]), 'me').isPublic).toBe(true);
  });

  it('keeps paging fields and survives an empty or malformed response', () => {
    expect(toHistoryPage(page([raw()], { total: 41, page: 3, pageSize: 10 }), 'me')).toMatchObject({ total: 41, page: 3, pageSize: 10 });
    expect(toHistoryPage(undefined, 'me')).toEqual({ items: [], total: 0, page: 1, pageSize: 20, isPublic: true });
    expect(toHistoryPage({ items: 'x' } as unknown as RawHistoryPage, 'me').items).toEqual([]);
  });
});
