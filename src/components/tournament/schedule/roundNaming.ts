import { format, isValid, parseISO } from 'date-fns';

export const BRACKET_SECTION_LABELS: Record<string, string> = {
  winners: 'Upper bracket',
  losers: 'Lower bracket',
  final: 'Grand final',
};

/** Human round names per format. Swiss and round robin rounds are one per day by default. */
export function getRoundName(format: string, roundIndex: number, totalRounds: number, isLosers = false): string {
  switch (format) {
    case 'double_elimination': {
      if (isLosers) return `Lower round ${roundIndex + 1}`;
      const fromEnd = totalRounds - roundIndex;
      if (fromEnd === 1) return 'Upper final';
      if (fromEnd === 2) return 'Upper semi-finals';
      return `Upper round ${roundIndex + 1}`;
    }
    case 'swiss':
      return `Round ${roundIndex + 1}`;
    case 'round_robin':
      return `Matchday ${roundIndex + 1}`;
    case 'single_elimination':
    default: {
      const fromEnd = totalRounds - roundIndex;
      if (fromEnd === 1) return 'Final';
      if (fromEnd === 2) return 'Semi-finals';
      if (fromEnd === 3) return 'Quarter-finals';
      return `Round ${roundIndex + 1}`;
    }
  }
}

export const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Single elimination',
  double_elimination: 'Double elimination',
  swiss: 'Swiss',
  round_robin: 'Round robin',
};

/** "Sat, Oct 4 · 3:00 PM" in the viewer's local time. */
export function formatWhen(iso: string | null | undefined, withTime = true): string | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (!isValid(d)) return null;
  return format(d, withTime ? 'EEE, MMM d · h:mm a' : 'EEE, MMM d');
}
