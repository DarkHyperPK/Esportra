import { differenceInCalendarDays, format, formatDistanceStrict, isValid, parseISO } from 'date-fns';
import type { Tone } from '@/components/ui/kit/tone';

export type TournamentCardMode = 'browse' | 'manage';

export interface TournamentCardModelInput {
  mode: TournamentCardMode;
  status: string;
  start_date?: string | null;
  registration_deadline?: string | null;
  max_participants: number;
  current_participants: number;
  team_size?: number;
  prize_pool?: string | number | null;
  entry_fee?: string | number | null;
  currency?: string | null;
  winner_name?: string | null;
  isRegistered?: boolean;
  /** Optional counts; shown only when the list endpoint already provides them. */
  checked_in_count?: number | null;
  pending_payments?: number | null;
}

export interface Segment { text: string; strong?: boolean }
export type ContextIcon = 'clock' | 'live' | 'trophy' | 'alert' | 'info' | 'check';
export interface ContextLine { icon: ContextIcon; tone: Tone; segments: Segment[] }

export type CardAction =
  | { kind: 'link'; label: string; emphasis: 'primary' | 'secondary'; to: 'public' | 'manage' }
  | { kind: 'registered' };

const toNumber = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const parse = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
};

export function isPaidEntry(entry: string | number | null | undefined): boolean {
  return toNumber(entry) > 0;
}

export function statusMeta(status: string, deadline?: string | null, now: Date = new Date()): { label: string; tone: Tone } {
  switch (status) {
    case 'ongoing': return { label: 'Live', tone: 'accent' };
    case 'check_in': return { label: 'Check-in open', tone: 'warning' };
    case 'completed': return { label: 'Completed', tone: 'neutral' };
    case 'draft': return { label: 'Draft', tone: 'neutral' };
    case 'cancelled': return { label: 'Cancelled', tone: 'critical' };
    case 'closed': return { label: 'Registration closed', tone: 'neutral' };
    case 'open':
    case 'published': {
      const d = parse(deadline);
      if (d && d < now) return { label: 'Registration closed', tone: 'neutral' };
      return status === 'open' ? { label: 'Registration open', tone: 'success' } : { label: 'Upcoming', tone: 'neutral' };
    }
    default: return { label: 'Upcoming', tone: 'neutral' };
  }
}

/** "150K" + "PKR"; zero or missing reads as an em dash. */
export function compactMoney(amount: string | number | null | undefined, currency?: string | null): { value: string; unit: string } {
  const n = toNumber(amount);
  if (n <= 0) return { value: '—', unit: '' };
  const value = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: n >= 1_000_000 ? 1 : 0 }).format(n);
  return { value, unit: (currency || 'USD').toUpperCase() };
}

export function startLabel(start?: string | null, now: Date = new Date()): { value: string; sub: string } {
  const d = parse(start);
  if (!d) return { value: 'TBD', sub: '' };
  const days = differenceInCalendarDays(d, now);
  const value = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : format(d, d.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy');
  return { value, sub: format(d, 'h:mm a') };
}

export function fillPercent(current: number, max: number): number | null {
  if (!max || max <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function browseContext(i: TournamentCardModelInput, now: Date): ContextLine {
  const entry = toNumber(i.entry_fee);
  const fee = entry > 0 ? `Entry ${(i.currency || 'USD').toUpperCase()} ${entry.toLocaleString('en-US')}` : 'Free entry';
  if (i.status === 'completed') {
    return i.winner_name
      ? { icon: 'trophy', tone: 'accent', segments: [{ text: 'Champion ' }, { text: i.winner_name, strong: true }] }
      : { icon: 'trophy', tone: 'neutral', segments: [{ text: 'Final results are in' }] };
  }
  if (i.status === 'ongoing') return { icon: 'live', tone: 'accent', segments: [{ text: 'Live now', strong: true }, { text: ' · follow the bracket' }] };
  if (i.status === 'cancelled') return { icon: 'alert', tone: 'critical', segments: [{ text: 'This event was cancelled' }] };
  if (i.status === 'check_in') return { icon: 'clock', tone: 'warning', segments: [{ text: 'Check-in is open', strong: true }, { text: ' for registered teams' }] };
  if (i.max_participants > 0 && i.current_participants >= i.max_participants) {
    return { icon: 'info', tone: 'neutral', segments: [{ text: 'Registration full', strong: true }, { text: ` · ${fee}` }] };
  }
  const deadline = parse(i.registration_deadline);
  if (deadline && deadline > now) {
    return { icon: 'clock', tone: 'neutral', segments: [{ text: 'Registration closes ' }, { text: `in ${formatDistanceStrict(deadline, now)}`, strong: true }, { text: ` · ${fee}` }] };
  }
  return { icon: 'info', tone: 'neutral', segments: [{ text: fee }] };
}

function manageContext(i: TournamentCardModelInput, now: Date): ContextLine {
  if (i.status === 'draft') {
    const missing = [!parse(i.start_date) && 'dates', !(i.max_participants > 0) && 'team cap'].filter(Boolean) as string[];
    return missing.length
      ? { icon: 'alert', tone: 'warning', segments: [{ text: 'Not published · ' }, { text: `add ${missing.join(' and ')}`, strong: true }] }
      : { icon: 'check', tone: 'success', segments: [{ text: 'Ready to publish', strong: true }, { text: ' · review and go live' }] };
  }
  const payments = i.pending_payments ?? 0;
  const payTail: Segment[] = payments > 0 ? [{ text: ' · ' }, { text: plural(payments, 'payment', 'payments'), strong: true }, { text: ' to review' }] : [];
  if (i.status === 'check_in' && i.checked_in_count != null) {
    return { icon: 'clock', tone: 'warning', segments: [{ text: `${i.checked_in_count} / ${i.current_participants}`, strong: true }, { text: ' checked in' }, ...payTail] };
  }
  if (payments > 0) return { icon: 'alert', tone: 'warning', segments: payTail.slice(1) };
  if (i.status === 'ongoing') return { icon: 'live', tone: 'accent', segments: [{ text: 'Live', strong: true }, { text: ' · run matches from the dashboard' }] };
  if (i.status === 'completed') {
    return i.winner_name
      ? { icon: 'trophy', tone: 'accent', segments: [{ text: 'Champion ' }, { text: i.winner_name, strong: true }] }
      : { icon: 'check', tone: 'neutral', segments: [{ text: 'Completed · check payouts' }] };
  }
  if (i.status === 'cancelled') return { icon: 'alert', tone: 'critical', segments: [{ text: 'Cancelled' }] };
  const left = i.max_participants > 0 ? Math.max(0, i.max_participants - i.current_participants) : null;
  const deadline = parse(i.registration_deadline);
  const closes: Segment[] = deadline && deadline > now ? [{ text: ` · closes in ${formatDistanceStrict(deadline, now)}` }] : [];
  if (left === 0) return { icon: 'check', tone: 'success', segments: [{ text: 'Full', strong: true }, ...closes] };
  if (left != null) return { icon: 'info', tone: 'neutral', segments: [{ text: plural(left, 'slot', 'slots'), strong: true }, { text: ' left' }, ...closes] };
  return { icon: 'info', tone: 'neutral', segments: [{ text: plural(i.current_participants, 'team', 'teams'), strong: true }, { text: ' registered' }, ...closes] };
}

export function contextLine(i: TournamentCardModelInput, now: Date = new Date()): ContextLine {
  return i.mode === 'manage' ? manageContext(i, now) : browseContext(i, now);
}

export function primaryAction(i: Pick<TournamentCardModelInput, 'mode' | 'status' | 'isRegistered' | 'team_size'>): CardAction {
  if (i.mode === 'manage') {
    return { kind: 'link', label: i.status === 'draft' ? 'Continue setup' : 'Manage', emphasis: 'primary', to: 'manage' };
  }
  if (i.isRegistered && !['completed', 'cancelled'].includes(i.status)) return { kind: 'registered' };
  switch (i.status) {
    case 'ongoing': return { kind: 'link', label: 'Watch live', emphasis: 'secondary', to: 'public' };
    case 'completed': return { kind: 'link', label: 'View results', emphasis: 'secondary', to: 'public' };
    case 'cancelled':
    case 'closed': return { kind: 'link', label: 'View details', emphasis: 'secondary', to: 'public' };
    default: return { kind: 'link', label: (i.team_size ?? 1) > 1 ? 'Register team' : 'Register', emphasis: 'primary', to: 'public' };
  }
}
