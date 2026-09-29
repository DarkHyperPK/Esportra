/**
 * Choices offered by Quick start, with plain-language copy.
 * Stage names and formats are what the API receives; labels and
 * descriptions are what organizers read.
 */

export interface StageTemplate {
  key: string;
  label: string;
  desc: string;
  stages: { name: string; format: string }[];
}

export const STAGE_TEMPLATES: StageTemplate[] = [
  {
    key: 'standard_cup',
    label: 'Single elimination',
    desc: 'Lose once and you are out. The quickest event to run.',
    stages: [{ name: 'Main Bracket', format: 'single_elimination' }],
  },
  {
    key: 'pro_cup',
    label: 'Double elimination',
    desc: 'Every team gets a second chance through the lower bracket.',
    stages: [{ name: 'Main Bracket', format: 'double_elimination' }],
  },
  {
    key: 'world_cup',
    label: 'Groups, then playoffs',
    desc: 'Round-robin groups decide who reaches a knockout bracket.',
    stages: [
      { name: 'Group Stage', format: 'round_robin' },
      { name: 'Playoffs', format: 'single_elimination' },
    ],
  },
  {
    key: 'major_format',
    label: 'Swiss, then playoffs',
    desc: 'Teams face opponents with the same record, then the best go to a knockout. The format pro events use.',
    stages: [
      { name: 'Swiss Stage', format: 'swiss' },
      { name: 'Playoffs', format: 'single_elimination' },
    ],
  },
];

export const BR_FORMATS: { key: string; label: string; desc: string }[] = [
  { key: 'single_lobby', label: 'Single lobby', desc: 'Every team plays in the same lobby.' },
  { key: 'static_groups', label: 'Fixed groups', desc: 'Teams stay in the same group for every match.' },
  { key: 'group_rotation', label: 'Rotating groups', desc: 'Groups swap each wave so everyone meets.' },
  { key: 'multi_lobby_cut', label: 'Lobbies with a cut', desc: 'Parallel lobbies; the top teams advance.' },
];

/** Next Saturday as YYYY-MM-DD — a sensible default for community events. */
export function getNextSaturday(from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().split('T')[0];
}

/** "Sat, Oct 3 · 6:00 PM", or null when the date or time is missing. */
export function formatStart(date: string, time: string): string | null {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) return null;
  const day = value.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const clock = value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${clock}`;
}
