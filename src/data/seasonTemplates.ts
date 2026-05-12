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
    id: 'team-bracket-safe',
    name: 'Team Championship',
    description: 'A safe two-step bracket season: one open qualifier feeds one closed final using winner-only tournament rules.',
    icon: 'Trophy',
    gameTags: ['fps', 'moba'],
    tournamentCount: 2,
    slots: [
      { name: 'Open Qualifier', type: 'qualifier', suggestedFormat: 'single_elimination', defaultBestOf: 1 },
      { name: 'Championship Final', type: 'finals', suggestedFormat: 'double_elimination', defaultBestOf: 3, description: 'Qualifier winner advances into the closed final' },
    ],
    intervalDays: 7,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
    ],
    advancementRules: [
      { source_tournament_id: '', target_tournament_id: '', placement_start: 1, placement_end: 1, advancement_count: 1, seed_mode: 'top_seeded' },
    ],
  },
  {
    id: 'sports-bracket-safe',
    name: 'Sports Cup',
    description: 'A safe single-event bracket season for sports titles with winner-only tournament rules.',
    icon: 'Crown',
    gameTags: ['sports'],
    tournamentCount: 1,
    slots: [
      { name: 'Main Cup', type: 'major', suggestedFormat: 'single_elimination', defaultBestOf: 3 },
    ],
    intervalDays: 0,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
    ],
  },
  {
    id: 'br-safe',
    name: 'Battle Royale Lobby',
    description: 'A safe single-lobby season starter for Battle Royale games with no unsupported placement-range rules.',
    icon: 'Target',
    gameTags: ['br'],
    tournamentCount: 1,
    slots: [
      { name: 'Main Lobby', type: 'match_day', suggestedFormat: 'battle_royale', defaultBestOf: 1 },
    ],
    intervalDays: 0,
    pointRules: [],
  },
  {
    id: 'fighter-safe',
    name: 'Fighting Championship',
    description: 'A safe double-elimination fighting game bracket with winner-only tournament rules.',
    icon: 'Swords',
    gameTags: ['fighter'],
    tournamentCount: 1,
    slots: [
      { name: 'Main Bracket', type: 'major', suggestedFormat: 'double_elimination', defaultBestOf: 3 },
    ],
    intervalDays: 0,
    pointRules: [
      { placement_start: 1, placement_end: 1, points: 100 },
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

  if (!genre) return SEASON_TEMPLATES.filter((t) => t.id === 'sports-bracket-safe');

  const template = SEASON_TEMPLATES.find((t) => t.gameTags.includes(genre));
  return template ? [template] : SEASON_TEMPLATES.filter((t) => t.id === 'sports-bracket-safe');
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
