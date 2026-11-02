/**
 * scrimTimeSuggestions.ts
 *
 * One-tap match times for proposing a time: this evening and the next few,
 * in the viewer's local time. Most scrims are evening games, so offering them
 * directly beats opening a calendar.
 */

const EVENING_HOURS = [19, 20, 21] as const;
const MIN_LEAD_MS = 30 * 60_000;

export function suggestMatchTimes(now: Date, count = 6): Date[] {
  const out: Date[] = [];
  for (let dayOffset = 0; dayOffset < 14 && out.length < count; dayOffset += 1) {
    for (const hour of EVENING_HOURS) {
      const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0, 0);
      if (candidate.getTime() >= now.getTime() + MIN_LEAD_MS && out.length < count) out.push(candidate);
    }
  }
  return out;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Today 8:00 PM", "Tomorrow 8:00 PM", "Thu 8:00 PM". */
export function labelSuggestion(date: Date, now: Date): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const day = sameDay(date, now)
    ? 'Today'
    : sameDay(date, tomorrow)
      ? 'Tomorrow'
      : date.toLocaleDateString(undefined, { weekday: 'short' });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} ${time}`;
}
