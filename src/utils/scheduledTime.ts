/** Normalize API / proposal datetimes to epoch ms for consistent window math. */
export function parseScheduledTimeMs(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

/** Canonical ISO string for display + Countdown props. */
export function normalizeScheduledTime(value: unknown): string | null {
  const ms = parseScheduledTimeMs(value);
  return ms == null ? null : new Date(ms).toISOString();
}

export function checkinWindowStartMs(scheduledTime: unknown, windowMinutes: number): number | null {
  const scheduledMs = parseScheduledTimeMs(scheduledTime);
  if (scheduledMs == null) return null;
  return scheduledMs - windowMinutes * 60_000;
}
