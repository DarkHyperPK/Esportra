import type { Tone } from '@/components/ui/kit/tone';
import type { PublicVetoUsageSummary } from '@/types/publicVetoSessions';

export function vetoUsageRates(summary: PublicVetoUsageSummary) {
  const rate = (numerator: number) => `${(summary.totalSessions ? numerator / summary.totalSessions * 100 : 0).toFixed(1)}%`;
  return { completion: rate(summary.completedSessions), overlay: rate(summary.overlaySessions) };
}
export function vetoPageDescription(page: number, pageSize: number, total: number) {
  if (!total) return 'Showing 0 of 0';
  return `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`;
}
export function vetoStatus(status: string): { label: string; tone: Tone } {
  const known: Record<string, { label: string; tone: Tone }> = {
    pending_toss: { label: 'Awaiting toss', tone: 'neutral' }, toss_choice_pending: { label: 'Toss choice pending', tone: 'warning' },
    in_progress: { label: 'In progress', tone: 'warning' }, completed: { label: 'Completed', tone: 'success' }, expired: { label: 'Expired', tone: 'neutral' },
  };
  return known[status] ?? { label: status.split('_').join(' ') || 'Unavailable', tone: 'neutral' };
}
export function formatVetoTimestamp(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  const date = new Date(value);
  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ?? 'Local';
  return { iso: date.toISOString(), date: date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }), zone };
}
