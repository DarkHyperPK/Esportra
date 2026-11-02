import { describe, expect, it } from 'vitest';
import { filterHistory, groupAgenda, historyResult, splitSessions, type AgendaSession } from '../scrimAgenda';

// Monday 2 Nov 2026, 15:00 local.
const NOW = new Date(2026, 10, 2, 15, 0).getTime();
const at = (dayOffset: number, hour = 20) => new Date(2026, 10, 2 + dayOffset, hour, 0).toISOString();

let n = 0;
const s = (over: Partial<AgendaSession>): AgendaSession => ({
  id: `s${++n}`,
  status: 'scheduled',
  scheduledAt: at(0),
  team1Name: 'Mine',
  team2Name: 'Nova',
  gameSlug: 'valorant',
  ...over,
});

describe('splitSessions', () => {
  it('puts open work in active and finished work in history', () => {
    const { active, history } = splitSessions([
      s({ status: 'scheduled' }),
      s({ status: 'in_progress' }),
      s({ status: 'disputed' }),
      s({ status: 'completed' }),
      s({ status: 'cancelled' }),
    ]);
    expect(active.map((x) => x.status)).toEqual(['scheduled', 'in_progress', 'disputed']);
    expect(history.map((x) => x.status)).toEqual(['completed', 'cancelled']);
  });

  it('orders history newest first', () => {
    const { history } = splitSessions([
      s({ status: 'completed', scheduledAt: at(-5) }),
      s({ status: 'completed', scheduledAt: at(-1) }),
      s({ status: 'completed', scheduledAt: null }),
    ]);
    expect(history.map((x) => x.scheduledAt)).toEqual([at(-1), at(-5), null]);
  });
});

describe('groupAgenda', () => {
  it('groups by live, today, this week, later, then unscheduled', () => {
    const groups = groupAgenda(
      [
        s({ id: 'later', scheduledAt: at(20) }),
        s({ id: 'week', scheduledAt: at(3) }),
        s({ id: 'today', scheduledAt: at(0, 21) }),
        s({ id: 'live', status: 'in_progress', scheduledAt: at(0, 14) }),
        s({ id: 'none', scheduledAt: null }),
      ],
      NOW,
    );
    expect(groups.map((g) => g.key)).toEqual(['live', 'today', 'week', 'later', 'unscheduled']);
    expect(groups.map((g) => g.sessions[0].id)).toEqual(['live', 'today', 'week', 'later', 'none']);
  });

  it('omits empty groups', () => {
    expect(groupAgenda([s({ scheduledAt: at(2) })], NOW).map((g) => g.key)).toEqual(['week']);
    expect(groupAgenda([], NOW)).toEqual([]);
  });

  it('treats a disputed scrim as needing attention alongside live ones', () => {
    const groups = groupAgenda([s({ status: 'disputed', scheduledAt: at(-2) })], NOW);
    expect(groups[0].key).toBe('live');
  });

  it('sorts each group soonest first', () => {
    const [week] = groupAgenda([s({ id: 'b', scheduledAt: at(5) }), s({ id: 'a', scheduledAt: at(2) })], NOW);
    expect(week.sessions.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('keeps an overdue scheduled scrim visible under today', () => {
    expect(groupAgenda([s({ scheduledAt: at(-3) })], NOW)[0].key).toBe('today');
  });

  it('puts day 7 in this week and day 8 later', () => {
    expect(groupAgenda([s({ scheduledAt: at(7) })], NOW)[0].key).toBe('week');
    expect(groupAgenda([s({ scheduledAt: at(8) })], NOW)[0].key).toBe('later');
  });

  it('labels the groups for people', () => {
    const labels = groupAgenda([s({ status: 'in_progress' }), s({ scheduledAt: at(0, 21) })], NOW).map((g) => g.label);
    expect(labels).toEqual(['Live and in review', 'Today']);
  });
});

describe('filterHistory', () => {
  const list = [s({ team2Name: 'Nova Esports' }), s({ team1Name: 'Apex', team2Name: 'Mine' }), s({ gameSlug: 'cs2' })];
  it('matches opponent, team or game, ignoring case', () => {
    expect(filterHistory(list, 'nova')).toHaveLength(2);
    expect(filterHistory(list, 'APEX')).toHaveLength(1);
    expect(filterHistory(list, 'cs2')).toHaveLength(1);
  });
  it('returns everything for a blank query', () => {
    expect(filterHistory(list, '   ')).toHaveLength(3);
  });
});

describe('historyResult', () => {
  const base = { team1Id: 'a', team2Id: 'b', team1Score: 2, team2Score: 1 };
  it('orients the score to my side', () => {
    expect(historyResult(base, 'a')).toEqual({ result: 'W', score: '2 – 1' });
    expect(historyResult(base, 'b')).toEqual({ result: 'L', score: '1 – 2' });
  });
  it('handles draws and missing scores', () => {
    expect(historyResult({ ...base, team2Score: 2 }, 'a')?.result).toBe('D');
    expect(historyResult({ ...base, team1Score: null }, 'a')).toBeNull();
  });
});
