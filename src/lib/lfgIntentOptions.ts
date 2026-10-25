/**
 * lfgIntentOptions.ts
 *
 * Pure data module — no React, no hooks.
 * Used by the intent picker UI (CreateListingSheet, FilterPanel) to render
 * the two-group intent selection.
 *
 * Source of truth: shared-contracts/types.md §1 (PROJ-075)
 */

import type { LfgIntent } from '@/types/competitive';

export interface LfgIntentOption {
  readonly value: LfgIntent;
  readonly label: string;
  readonly description: string;
}

export interface LfgIntentGroup {
  readonly label: string;
  readonly intents: ReadonlyArray<LfgIntentOption>;
}

export const LFG_INTENT_GROUPS: ReadonlyArray<LfgIntentGroup> = [
  {
    label: "I'm looking for...",
    intents: [
      { value: 'duo',              label: 'Duo Partner',   description: 'Find one person to queue with' },
      { value: 'group',            label: 'Group',          description: 'Get a group together for a session' },
      { value: 'teammates',        label: 'Teammates',      description: 'Find people for regular play' },
      { value: 'looking_for_team', label: 'A Team',         description: 'Join an established team' },
      { value: 'casual',           label: 'Casual Play',    description: 'No pressure, just for fun' },
    ],
  },
  {
    label: 'My team is looking for...',
    intents: [
      { value: 'looking_for_player', label: 'Players',            description: 'Recruit players for your team' },
      { value: 'competitive_roster', label: 'Competitive Roster', description: 'Build a roster for tournaments' },
    ],
  },
] as const;

/**
 * Flat array of all intent options — convenience for filter chips and validation.
 */
export const ALL_LFG_INTENTS: ReadonlyArray<LfgIntentOption> = LFG_INTENT_GROUPS.flatMap(
  (g) => g.intents,
);

/**
 * Look up a human-readable label for a given LfgIntent value.
 * Returns the value itself if not found (safe fallback).
 */
export function getLfgIntentLabel(value: LfgIntent): string {
  return ALL_LFG_INTENTS.find((o) => o.value === value)?.label ?? value;
}
