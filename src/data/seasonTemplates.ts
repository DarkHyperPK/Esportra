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
    id: 'qualifier-to-final',
    name: 'Qualifier to Final',
    description: 'Open qualifier intake feeds a closed final. Best for clear regional or community qualification paths.',
    icon: 'Trophy',
    gameTags: ['fps', 'moba', 'sports', 'fighter'],
    tournamentCount: 2,
    slots: [
      { name: 'Open Qualifier', type: 'qualifier', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Championship Final', type: 'finals', suggestedFormat: 'double_elimination', defaultBestOf: 3, description: 'Closed final populated only by qualified teams' },
    ],
    intervalDays: 7,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
    ],
    advancementRules: [
      { source_tournament_id: '', target_tournament_id: '', placement_start: 1, placement_end: 4, advancement_count: 4, seed_mode: 'top_seeded' },
    ],
  },
  {
    id: 'points-events-to-final',
    name: 'Points Events to Final',
    description: 'Multiple season events build standings, then top teams qualify into a closed final.',
    icon: 'Target',
    gameTags: ['fps', 'moba', 'sports', 'fighter', 'br'],
    tournamentCount: 4,
    slots: [
      { name: 'Season Event 1', type: 'match_day', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Season Event 2', type: 'match_day', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Season Event 3', type: 'match_day', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Season Final', type: 'finals', suggestedFormat: 'double_elimination', defaultBestOf: 3, description: 'Closed final populated from standings rank' },
    ],
    intervalDays: 7,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
      { placement_start: 2, placement_end: 2, points: 75 },
      { placement_start: 3, placement_end: 4, points: 50 },
    ],
    advancementRules: [
      { source_tournament_id: '', target_tournament_id: '', placement_start: 1, placement_end: 8, advancement_count: 8, seed_mode: 'top_seeded' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start with a clean season shell and manually add qualifiers, points events, and finals.',
    icon: 'Settings',
    gameTags: ['fps', 'moba', 'sports', 'fighter', 'br'],
    tournamentCount: 0,
    slots: [],
    intervalDays: 0,
    pointRules: [
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
    : gameName.toLowerCase().includes('league') || gameName.toLowerCase().includes('lol') || gameName.toLowerCase().includes('dota')
    ? 'moba'
    : null;

  if (!genre) return SEASON_TEMPLATES;

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
