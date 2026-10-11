/**
 * broadcastFormat.ts
 * Pure formatting utilities for broadcast P4 surfaces (T36, T37, T38).
 * All functions are stateless and testable.
 */

/**
 * Format a duration in seconds as MM:SS or H:MM:SS.
 * 0–3599s → "MM:SS"; 3600s+ → "H:MM:SS"
 */
export function formatDuration(seconds: number): string {
  const totalSecs = Math.floor(seconds);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Format an offset in seconds as HH:MM:SS (always 8 characters).
 * Used for VOD chapter timestamps.
 */
export function formatOffset(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Format an ISO timestamp for the post-show report show section.
 * Result: "14 Oct 2026, 19:00 UTC"
 */
export function formatShowDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  );
}

/**
 * Format a date for the sponsor print document title line.
 * Result: "14 Oct 2026"
 */
export function formatPrintDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Slot type display labels for sponsor proof. */
export const SLOT_TYPE_LABELS: Record<string, string> = {
  lower_third: 'Lower third',
  bug: 'Bug',
  scorebug: 'Scorebug',
  full_screen: 'Full-screen',
  break_fullscreen: 'Break full-screen',
  custom: 'Custom',
};

export function slotTypeLabel(slotType: string): string {
  return SLOT_TYPE_LABELS[slotType] ?? slotType;
}
