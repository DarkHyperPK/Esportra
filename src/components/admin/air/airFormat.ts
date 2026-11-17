import type { AirStatus } from '@/hooks/useAirAdmin';

const DAY = 86_400_000;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'No end';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Never';
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export function limitText(limit: number | null): string {
  return limit === null ? 'no limit' : String(limit);
}

/** Where someone's access stands, in one short line. */
export function accessLine(
  status: AirStatus | null,
  validUntil: string | null,
  trialEndsAt: string | null,
  now = Date.now(),
): string {
  if (!status) return 'Has not opened Air';
  if (status === 'suspended') return 'Suspended';
  if (status === 'revoked') return 'Revoked';
  if (validUntil) {
    const end = new Date(validUntil).getTime();
    return end > now ? `Active until ${formatDate(validUntil)}` : `Ended ${formatDate(validUntil)}`;
  }
  if (trialEndsAt && new Date(trialEndsAt).getTime() <= now) return `Trial ended ${formatDate(trialEndsAt)}`;
  return 'Active, no end';
}

/** A yyyy-mm-dd date input value, `days` from now. */
export function dateInDays(days: number, now = Date.now()): string {
  return new Date(now + days * DAY).toISOString().slice(0, 10);
}

/** The end of the chosen day in local time, as the API's timestamp. */
export function endOfDay(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Reads a PC limit field: empty means no limit, otherwise 0–1000. */
export function readLimit(value: string): number | null | 'invalid' {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d{1,4}$/.test(text)) return 'invalid';
  const n = Number(text);
  return n <= 1000 ? n : 'invalid';
}

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const ACTION_LABELS: Record<string, string> = {
  access_updated: 'Access changed',
  request_declined: 'Request declined',
  device_revoked: 'PC revoked',
  plan_created: 'Plan added',
  plan_updated: 'Plan changed',
  release_created: 'Release added',
  release_updated: 'Release changed',
};

export const fieldClass =
  'w-full rounded-none border border-white/10 bg-[#09090B] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none';
