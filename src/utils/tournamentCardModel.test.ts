import { describe, expect, it } from 'vitest';
import {
  compactMoney, contextLine, fillPercent, isPaidEntry, primaryAction, startLabel, statusMeta, type TournamentCardModelInput,
} from './tournamentCardModel';

const now = new Date('2026-10-10T12:00:00');
const base: TournamentCardModelInput = { mode: 'browse', status: 'open', max_participants: 64, current_participants: 41, team_size: 5, currency: 'PKR' };
const text = (i: TournamentCardModelInput) => contextLine(i, now).segments.map((s) => s.text).join('');

describe('statusMeta', () => {
  it('maps statuses to labels and tones', () => {
    expect(statusMeta('ongoing')).toEqual({ label: 'Live', tone: 'accent' });
    expect(statusMeta('check_in').tone).toBe('warning');
    expect(statusMeta('cancelled').tone).toBe('critical');
    expect(statusMeta('open', null, now)).toEqual({ label: 'Registration open', tone: 'success' });
  });
  it('treats a passed deadline as closed', () => {
    expect(statusMeta('open', '2026-10-09T12:00:00', now).label).toBe('Registration closed');
  });
});

describe('scoreboard helpers', () => {
  it('formats compact money and empty prizes', () => {
    expect(compactMoney('150000', 'pkr')).toEqual({ value: '150K', unit: 'PKR' });
    expect(compactMoney(2_500_000, 'USD')).toEqual({ value: '2.5M', unit: 'USD' });
    expect(compactMoney('0')).toEqual({ value: '—', unit: '' });
  });
  it('labels start dates relative to now', () => {
    expect(startLabel('2026-10-10T19:30:00', now)).toEqual({ value: 'Today', sub: '7:30 PM' });
    expect(startLabel('2026-10-11T19:30:00', now).value).toBe('Tomorrow');
    expect(startLabel('2026-10-18T19:30:00', now).value).toBe('Oct 18');
    expect(startLabel(null, now)).toEqual({ value: 'TBD', sub: '' });
  });
  it('computes fill and paid entry', () => {
    expect(fillPercent(41, 64)).toBe(64);
    expect(fillPercent(5, 0)).toBeNull();
    expect(isPaidEntry('Free')).toBe(false);
    expect(isPaidEntry('2500')).toBe(true);
  });
});

describe('contextLine (browse)', () => {
  it('shows the registration deadline and fee', () => {
    expect(text({ ...base, registration_deadline: '2026-10-12T12:00:00', entry_fee: '2500' })).toBe('Registration closes in 2 days · Entry PKR 2,500');
  });
  it('shows the champion when completed', () => {
    expect(text({ ...base, status: 'completed', winner_name: 'Night Owls' })).toBe('Champion Night Owls');
  });
  it('says when registration is full', () => {
    expect(text({ ...base, current_participants: 64 })).toBe('Registration full · Free entry');
  });
});

describe('contextLine (manage)', () => {
  const m = { ...base, mode: 'manage' as const };
  it('lists what a draft is missing', () => {
    expect(text({ ...m, status: 'draft', max_participants: 0 })).toBe('Not published · add dates and team cap');
  });
  it('uses check-in and payment counts when provided', () => {
    expect(text({ ...m, status: 'check_in', checked_in_count: 41, current_participants: 58, pending_payments: 3 })).toBe('41 / 58 checked in · 3 payments to review');
  });
  it('falls back to slots left', () => {
    expect(text({ ...m, registration_deadline: '2026-10-12T12:00:00' })).toBe('23 slots left · closes in 2 days');
  });
});

describe('primaryAction', () => {
  it('picks the browse action by status and registration', () => {
    expect(primaryAction({ mode: 'browse', status: 'open', team_size: 5 })).toMatchObject({ label: 'Register team', emphasis: 'primary' });
    expect(primaryAction({ mode: 'browse', status: 'open', isRegistered: true })).toEqual({ kind: 'registered' });
    expect(primaryAction({ mode: 'browse', status: 'ongoing' })).toMatchObject({ label: 'Watch live' });
    expect(primaryAction({ mode: 'browse', status: 'completed', isRegistered: true })).toMatchObject({ label: 'View results' });
  });
  it('picks the manage action', () => {
    expect(primaryAction({ mode: 'manage', status: 'draft' })).toMatchObject({ label: 'Continue setup', to: 'manage' });
    expect(primaryAction({ mode: 'manage', status: 'open' })).toMatchObject({ label: 'Manage' });
  });
});
