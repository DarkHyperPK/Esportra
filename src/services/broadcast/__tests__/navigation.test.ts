import { describe, expect, it } from 'vitest';
import { usesBroadcastWorkspaceNavigation } from '../navigation';

describe('broadcast workspace navigation ownership', () => {
  it('removes site navigation for focused preparation and independent projects', () => {
    expect(usesBroadcastWorkspaceNavigation('/broadcast/shows/final/setup')).toBe(true);
    expect(usesBroadcastWorkspaceNavigation('/air')).toBe(true);
    expect(usesBroadcastWorkspaceNavigation('/organizer/tournament/final', '?tab=broadcast')).toBe(true);
  });
  it('preserves unrelated tournament, public and admin navigation', () => {
    expect(usesBroadcastWorkspaceNavigation('/organizer/tournament/final', '?tab=bracket')).toBe(false);
    expect(usesBroadcastWorkspaceNavigation('/broadcasting')).toBe(false);
    expect(usesBroadcastWorkspaceNavigation('/admin/air')).toBe(false);
    expect(usesBroadcastWorkspaceNavigation('/tournaments/final')).toBe(false);
  });
});
