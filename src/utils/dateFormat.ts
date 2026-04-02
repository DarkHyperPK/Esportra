const ORDINAL_SUFFIXES = ['th', 'st', 'nd', 'rd'] as const;

function ordinal(day: number): string {
  const v = day % 100;
  return day + (ORDINAL_SUFFIXES[(v - 20) % 10] || ORDINAL_SUFFIXES[v] || ORDINAL_SUFFIXES[0]);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format a date string/Date as "3rd Apr 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format a date string/Date as "14:30" (24h) or "2:30 PM" (12h) */
export function formatTime(value: string | Date | null | undefined, use12h = true): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: use12h,
  });
}

/** Format as "3rd Apr 2026 at 2:30 PM" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const datePart = formatDate(value);
  const timePart = formatTime(value);
  if (!datePart) return '';
  return timePart ? `${datePart} at ${timePart}` : datePart;
}
