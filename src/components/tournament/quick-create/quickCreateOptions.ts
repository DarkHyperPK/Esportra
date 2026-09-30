/**
 * Choices offered by Quick start, with plain-language copy.
 * Date/time helpers used by QuickCreateForm.
 */

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
