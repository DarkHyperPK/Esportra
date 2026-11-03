/** Scrim Insights sections, two levels deep. The address keeps the leaf (?tab=maps), so links to a section keep working. */
export const INSIGHT_TABS = ['overview', 'history', 'timeline', 'team-report', 'maps', 'agents', 'heatmaps', 'trends', 'player-reports', 'players', 'opponents'] as const;
export type InsightTab = (typeof INSIGHT_TABS)[number];

export interface InsightGroup { id: string; label: string; tabs: ReadonlyArray<{ id: InsightTab; label: string }> }

export const INSIGHT_GROUPS: readonly InsightGroup[] = [
  { id: 'overview', label: 'Overview', tabs: [{ id: 'overview', label: 'Overview' }] },
  { id: 'matches', label: 'Matches', tabs: [{ id: 'history', label: 'History' }, { id: 'timeline', label: 'Timeline' }] },
  { id: 'team', label: 'Team', tabs: [{ id: 'team-report', label: 'Report' }, { id: 'maps', label: 'Maps' }, { id: 'agents', label: 'Agents & comps' }, { id: 'heatmaps', label: 'Heatmaps' }, { id: 'trends', label: 'Trends' }] },
  { id: 'players', label: 'Players', tabs: [{ id: 'player-reports', label: 'Reports' }, { id: 'players', label: 'Stats' }] },
  { id: 'opponents', label: 'Opponents', tabs: [{ id: 'opponents', label: 'Opponents' }] },
];

export const groupOf = (tab: InsightTab): InsightGroup => INSIGHT_GROUPS.find((g) => g.tabs.some((t) => t.id === tab)) ?? INSIGHT_GROUPS[0];
