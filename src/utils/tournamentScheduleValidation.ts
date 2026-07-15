import { utcToLocalInput } from '@/lib/timeUtils';

const WINDOW_FMT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

export function formatTournamentWindow(
  startDate?: string | null,
  endDate?: string | null,
): string {
  if (!startDate && !endDate) return 'the tournament schedule';
  if (startDate && endDate) {
    return `${new Date(startDate).toLocaleString('en-US', WINDOW_FMT)} – ${new Date(endDate).toLocaleString('en-US', WINDOW_FMT)}`;
  }
  if (startDate) {
    return `on or after ${new Date(startDate).toLocaleString('en-US', WINDOW_FMT)}`;
  }
  return `on or before ${new Date(endDate!).toLocaleString('en-US', WINDOW_FMT)}`;
}

export function validateTimestampInTournamentWindow(
  timestampIso: string | null | undefined,
  startDate?: string | null,
  endDate?: string | null,
  actionLabel = 'Schedule',
): string | null {
  if (!timestampIso) return null;

  const ts = new Date(timestampIso).getTime();
  if (Number.isNaN(ts)) return `${actionLabel} has an invalid time.`;

  if (startDate) {
    const start = new Date(startDate).getTime();
    if (!Number.isNaN(start) && ts < start) {
      return `${actionLabel} must be within the tournament window (${formatTournamentWindow(startDate, endDate)}).`;
    }
  }

  if (endDate) {
    const end = new Date(endDate).getTime();
    if (!Number.isNaN(end) && ts > end) {
      return `${actionLabel} must be within the tournament window (${formatTournamentWindow(startDate, endDate)}).`;
    }
  }

  return null;
}

export function validateLocalDatetimeInTournamentWindow(
  localDatetime: string,
  startDate?: string | null,
  endDate?: string | null,
  actionLabel = 'Schedule',
): string | null {
  if (!localDatetime.trim()) return null;
  return validateTimestampInTournamentWindow(
    new Date(localDatetime).toISOString(),
    startDate,
    endDate,
    actionLabel,
  );
}

export function validateLiveActionInTournamentWindow(
  startDate?: string | null,
  endDate?: string | null,
  actionLabel = 'Starting a round',
  nowMs: number = Date.now(),
): string | null {
  return validateTimestampInTournamentWindow(
    new Date(nowMs).toISOString(),
    startDate,
    endDate,
    actionLabel,
  );
}

export function getTournamentDatetimeLocalBounds(
  startDate?: string | null,
  endDate?: string | null,
): { min: string; max: string; windowLabel: string } {
  const min = startDate ? utcToLocalInput(startDate) : '';
  const max = endDate ? utcToLocalInput(endDate) : '';
  return {
    min,
    max: min && max && max < min ? '' : max,
    windowLabel: formatTournamentWindow(startDate, endDate),
  };
}

/** Pick the later of two datetime-local strings (YYYY-MM-DDTHH:mm). */
export function maxDatetimeLocal(a: string, b: string): string {
  if (!a.trim()) return b;
  if (!b.trim()) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}
