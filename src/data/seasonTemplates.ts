/**
 * seasonTemplates.ts — Pre-configured season structures for game-aware creation.
 *
 * Each template defines a complete season blueprint: tournament slots, point rules,
 * and advancement logic. When a user picks a game, we filter templates by genre.
 */

import type { CreatePointRuleRequest, CreateAdvancementRuleRequest } from '@/types/season';

export type TournamentSlotType = 'weekly' | 'qualifier' | 'monthly' | 'match_day' | 'finals' | 'major';

export interface TournamentSlot {
  name: string;           // e.g. "Week 1", "Qualifier #1"
  type: TournamentSlotType;
  suggestedFormat: string; // 'single_elimination', 'double_elimination', 'swiss', 'battle_royale'
  defaultBestOf: number;
  description?: string;
}

export interface SeasonTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;           // lucide icon name
  gameTags: string[];   // genres: 'fps', 'moba', 'br', 'fighter', 'sports', 'rts'
  tournamentCount: number;
  slots: TournamentSlot[];
  intervalDays: number;   // Days between slots
  pointRules: CreatePointRuleRequest[];
  advancementRules?: CreateAdvancementRuleRequest[];
}

export const SEASON_TEMPLATES: SeasonTemplate[] = [
  {
    id: 'weekly-circuit',
    name: 'Weekly Circuit',
    description: 'A series of weekly cups culminating in a grand finals. Teams earn cumulative points across all events.',
    icon: 'Calendar',
    gameTags: ['fps', 'moba', 'sports', 'rts'],
    tournamentCount: 8,
    slots: [
      { name: 'Week 1', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 2', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 3', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 4', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 5', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 6', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 7', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Grand Finals', type: 'finals', suggestedFormat: 'double_elimination', defaultBestOf: 5, description: 'Top 16 teams by points' },
    ],
    intervalDays: 7,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
      { placement_start: 2, placement_end: 2, points: 75 },
      { placement_start: 3, placement_end: 3, points: 60 },
      { placement_start: 4, placement_end: 4, points: 50 },
      { placement_start: 5, placement_end: 8, points: 30 },
      { placement_start: 9, placement_end: 16, points: 15 },
      { placement_start: 17, placement_end: 32, points: 5 },
    ],
    advancementRules: [
      { source_tournament_id: '', target_tournament_id: '', placement_start: 1, placement_end: 16, advancement_count: 16, seed_mode: 'top_seeded' },
    ],
  },
  {
    id: 'qualifier-ladder',
    name: 'Qualifier Ladder',
    description: 'Four open qualifiers feed into a closed championship. Only the best teams from each qualifier advance.',
    icon: 'Trophy',
    gameTags: ['fps', 'moba'],
    tournamentCount: 5,
    slots: [
      { name: 'Open Qualifier #1', type: 'qualifier', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Open Qualifier #2', type: 'qualifier', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Open Qualifier #3', type: 'qualifier', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Open Qualifier #4', type: 'qualifier', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Championship', type: 'finals', suggestedFormat: 'double_elimination', defaultBestOf: 3, description: 'Top 4 from each qualifier' },
    ],
    intervalDays: 7,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
      { placement_start: 2, placement_end: 2, points: 70 },
      { placement_start: 3, placement_end: 3, points: 50 },
      { placement_start: 4, placement_end: 4, points: 40 },
      { placement_start: 5, placement_end: 8, points: 20 },
    ],
    advancementRules: [
      { source_tournament_id: '', target_tournament_id: '', placement_start: 1, placement_end: 4, advancement_count: 4, seed_mode: 'top_seeded' },
    ],
  },
  {
    id: 'monthly-series',
    name: 'Monthly Series',
    description: 'Three monthly tournaments with cumulative standings. Simple and flexible for any game.',
    icon: 'CalendarDays',
    gameTags: ['fps', 'moba', 'sports', 'rts', 'fighter'],
    tournamentCount: 3,
    slots: [
      { name: 'Monthly #1', type: 'monthly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Monthly #2', type: 'monthly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Monthly #3', type: 'monthly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
    ],
    intervalDays: 30,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
      { placement_start: 2, placement_end: 2, points: 75 },
      { placement_start: 3, placement_end: 3, points: 60 },
      { placement_start: 4, placement_end: 4, points: 50 },
      { placement_start: 5, placement_end: 8, points: 30 },
      { placement_start: 9, placement_end: 16, points: 15 },
    ],
  },
  {
    id: 'single-major',
    name: 'Single Major',
    description: 'One large tournament with group stage and playoffs. Minimal season wrapper for a flagship event.',
    icon: 'Crown',
    gameTags: ['fps', 'moba', 'sports', 'rts', 'fighter'],
    tournamentCount: 1,
    slots: [
      { name: 'Main Event', type: 'major', suggestedFormat: 'swiss', defaultBestOf: 3, description: 'Groups + Playoffs' },
    ],
    intervalDays: 0,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
      { placement_start: 2, placement_end: 2, points: 60 },
      { placement_start: 3, placement_end: 3, points: 40 },
      { placement_start: 4, placement_end: 4, points: 30 },
      { placement_start: 5, placement_end: 8, points: 20 },
    ],
  },
  {
    id: 'br-league',
    name: 'BR League',
    description: 'Five match days with placement-based scoring. Designed for Battle Royale games.',
    icon: 'Target',
    gameTags: ['br'],
    tournamentCount: 5,
    slots: [
      { name: 'Match Day 1', type: 'match_day', suggestedFormat: 'battle_royale', defaultBestOf: 6 },
      { name: 'Match Day 2', type: 'match_day', suggestedFormat: 'battle_royale', defaultBestOf: 6 },
      { name: 'Match Day 3', type: 'match_day', suggestedFormat: 'battle_royale', defaultBestOf: 6 },
      { name: 'Match Day 4', type: 'match_day', suggestedFormat: 'battle_royale', defaultBestOf: 6 },
      { name: 'Match Day 5', type: 'match_day', suggestedFormat: 'battle_royale', defaultBestOf: 6 },
    ],
    intervalDays: 7,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
      { placement_start: 2, placement_end: 2, points: 80 },
      { placement_start: 3, placement_end: 3, points: 65 },
      { placement_start: 4, placement_end: 5, points: 50 },
      { placement_start: 6, placement_end: 10, points: 35 },
      { placement_start: 11, placement_end: 20, points: 20 },
      { placement_start: 21, placement_end: 50, points: 10 },
    ],
  },
  {
    id: 'weekly-showdown',
    name: 'Weekly Showdown',
    description: 'Eight weekly bracket events with championship points. Perfect for fighting games.',
    icon: 'Swords',
    gameTags: ['fighter'],
    tournamentCount: 8,
    slots: [
      { name: 'Week 1', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 2', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 3', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 4', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 5', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 6', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 7', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
      { name: 'Week 8', type: 'weekly', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
    ],
    intervalDays: 7,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
      { placement_start: 2, placement_end: 2, points: 70 },
      { placement_start: 3, placement_end: 3, points: 50 },
      { placement_start: 4, placement_end: 4, points: 40 },
      { placement_start: 5, placement_end: 8, points: 25 },
      { placement_start: 9, placement_end: 16, points: 10 },
    ],
  },
];

/** Get templates filtered by game genre */
export function getTemplatesForGame(gameName: string): SeasonTemplate[] {
  const genre = gameName.toLowerCase().includes('fortnite') ||
                gameName.toLowerCase().includes('apex') ||
                gameName.toLowerCase().includes('pubg')
    ? 'br'
    : gameName.toLowerCase().includes('tekken') || gameName.toLowerCase().includes('street')
    ? 'fighter'
    : gameName.toLowerCase().includes('rocket') || gameName.toLowerCase().includes('fc')
    ? 'sports'
    : gameName.toLowerCase().includes('valorant') || gameName.toLowerCase().includes('cs')
    ? 'fps'
    : gameName.toLowerCase().includes('lol') || gameName.toLowerCase().includes('dota')
    ? 'moba'
    : null;

  if (!genre) return SEASON_TEMPLATES.slice(0, 3); // fallback

  return SEASON_TEMPLATES.filter((t) => t.gameTags.includes(genre));
}

/** Get template by ID */
export function getTemplateById(id: string): SeasonTemplate | undefined {
  return SEASON_TEMPLATES.find((t) => t.id === id);
}

/** Generate tournament slot names with dates */
export function generateSlotDates(
  template: SeasonTemplate,
  startDate: string
): Array<{ name: string; suggestedDate: string }> {
  const start = new Date(startDate);
  return template.slots.map((slot, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i * template.intervalDays);
    return {
      name: slot.name,
      suggestedDate: date.toISOString().split('T')[0],
    };
  });
}

export default SEASON_TEMPLATES;
