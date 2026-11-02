import { describe, expect, it } from 'vitest';
import { describeFit, fitLabelFor, sortListings, weekFlags, type SortableListing } from '../scrimListingView';
import { parseMembersPreview } from '../scrimUtils';

describe('weekFlags', () => {
  it('lays the week out Monday to Sunday and marks the chosen days', () => {
    const week = weekFlags([1, 3, 5]);
    expect(week.map((d) => d.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(week.filter((d) => d.active).map((d) => d.name)).toEqual(['Mon', 'Wed', 'Fri']);
  });
  it('puts Sunday (0) last', () => {
    const week = weekFlags([0]);
    expect(week[6]).toMatchObject({ name: 'Sun', active: true });
    expect(week.slice(0, 6).every((d) => !d.active)).toBe(true);
  });
  it('is all inactive for none, null or junk', () => {
    expect(weekFlags(null).every((d) => !d.active)).toBe(true);
    expect(weekFlags([]).every((d) => !d.active)).toBe(true);
    expect(weekFlags([9, -1]).every((d) => !d.active)).toBe(true);
  });
});

describe('describeFit', () => {
  const fit = (rankOverlap: boolean | null, sameRegion: boolean | null) => ({
    level: 'good' as const, rankOverlap, sameRegion,
  });
  it('says good fit when bands overlap and regions match', () => {
    expect(describeFit(fit(true, true))).toEqual({ label: 'Good fit', tone: 'success' });
    expect(describeFit(fit(true, null))?.tone).toBe('success');
  });
  it('names the specific problem, rank first', () => {
    expect(describeFit(fit(false, true))).toEqual({ label: 'Rank gap', tone: 'warning' });
    expect(describeFit(fit(true, false))).toEqual({ label: 'Other region', tone: 'warning' });
    expect(describeFit(fit(false, false))?.label).toBe('Rank gap');
  });
  it('shows nothing when there is nothing to compare', () => {
    expect(describeFit(fit(null, null))).toBeNull();
    expect(describeFit(null)).toBeNull();
  });
});

describe('sortListings', () => {
  const l = (id: string, createdAt: string, record: SortableListing['record']): SortableListing => ({ id, createdAt, record });
  const rec = (wins: number, losses: number, completed: number, showRate: number | null) =>
    ({ wins, losses, completed, showRate });
  const list = [
    l('old-best', '2026-10-01T00:00:00Z', rec(18, 2, 20, 0.7)),
    l('new-ok', '2026-11-02T00:00:00Z', rec(6, 6, 12, 0.99)),
    l('private', '2026-10-20T00:00:00Z', null),
    l('fresh', '2026-10-25T00:00:00Z', rec(0, 0, 0, null)),
  ];
  const ids = (s: ReturnType<typeof sortListings>) => s.map((x) => x.id);

  it('newest first by default', () => {
    expect(ids(sortListings(list, 'newest'))).toEqual(['new-ok', 'fresh', 'private', 'old-best']);
  });
  it('best record by win rate, with hidden and empty records last', () => {
    expect(ids(sortListings(list, 'record'))).toEqual(['old-best', 'new-ok', 'private', 'fresh']);
  });
  it('most reliable by show rate, with unknown last', () => {
    expect(ids(sortListings(list, 'reliable'))).toEqual(['new-ok', 'old-best', 'private', 'fresh']);
  });
  it('breaks ties by experience and never mutates the input', () => {
    const tie = [l('a', '2026-11-01T00:00:00Z', rec(5, 5, 10, 0.9)), l('b', '2026-11-01T00:00:00Z', rec(10, 10, 20, 0.9))];
    expect(ids(sortListings(tie, 'record'))).toEqual(['b', 'a']);
    const before = ids(list);
    sortListings(list, 'record');
    expect(ids(list)).toEqual(before);
  });
});

describe('parseMembersPreview accepts what discovery sends', () => {
  it('handles an already-parsed, camelCased array', () => {
    expect(parseMembersPreview([{ username: 'a', avatarSeed: 's', rankTierKey: 'gold' }]))
      .toEqual([{ username: 'a', avatarSeed: 's', rankTierKey: 'gold' }]);
  });
  it('still handles the JSON string and bad input', () => {
    expect(parseMembersPreview(JSON.stringify([{ username: 'b', avatar_seed: 'x' }]))[0].avatarSeed).toBe('x');
    expect(parseMembersPreview(42 as unknown as string)).toEqual([]);
  });
});

describe('fitLabelFor', () => {
  const mine = { regionKey: 'eu', minRankSortOrder: 3, maxRankSortOrder: 6 };
  it('compares a listing with the viewer\'s own band', () => {
    expect(fitLabelFor(mine, { regionKey: 'eu', minRankSortOrder: 5, maxRankSortOrder: 9 })?.label).toBe('Good fit');
    expect(fitLabelFor(mine, { regionKey: 'eu', minRankSortOrder: 8, maxRankSortOrder: 11 })?.label).toBe('Rank gap');
    expect(fitLabelFor(mine, { regionKey: 'na', minRankSortOrder: 4, maxRankSortOrder: 5 })?.label).toBe('Other region');
  });
  it('shows nothing when the viewer has no listing to compare against', () => {
    expect(fitLabelFor(null, { regionKey: 'eu', minRankSortOrder: 5, maxRankSortOrder: 9 })).toBeNull();
  });
});
