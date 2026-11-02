/**
 * scrimAgenda.ts
 *
 * Pure grouping for the workspace agenda: what is live, what is coming and
 * when, and the finished history. Time is injected so it is testable.
 */

import { isUpcomingSession } from '@/services/scrimStatusMeta';
import type { ScrimSessionStatus } from '@/types/competitive';

/** The few session fields the agenda needs; ScrimSession satisfies this. */
export interface AgendaSession {
  id: string;
  status: ScrimSessionStatus;
  scheduledAt: string | null;
  team1Name?: string | null;
  team2Name?: string | null;
  gameSlug: string | null;
}

export type AgendaGroupKey = 'live' | 'today' | 'week' | 'later' | 'unscheduled';

export interface AgendaGroup<T extends AgendaSession> {
  key: AgendaGroupKey;
  label: string;
  sessions: T[];
}

const LABELS: Record<AgendaGroupKey, string> = {
  live: 'Live and in review',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  unscheduled: 'No time set',
};
const ORDER: AgendaGroupKey[] = ['live', 'today', 'week', 'later', 'unscheduled'];
const DAY_MS = 86_400_000;

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const timeOf = (s: AgendaSession) => (s.scheduledAt ? new Date(s.scheduledAt).getTime() : Number.POSITIVE_INFINITY);

export function splitSessions<T extends AgendaSession>(sessions: T[]): { active: T[]; history: T[] } {
  const active = sessions.filter((s) => isUpcomingSession(s.status) || s.status === 'disputed');
  const history = sessions
    .filter((s) => s.status === 'completed' || s.status === 'cancelled')
    .sort((a, b) => (b.scheduledAt ? new Date(b.scheduledAt).getTime() : -Infinity) - (a.scheduledAt ? new Date(a.scheduledAt).getTime() : -Infinity));
  return { active, history };
}

function bucketOf(s: AgendaSession, nowMs: number): AgendaGroupKey {
  if (s.status === 'in_progress' || s.status === 'disputed') return 'live';
  if (!s.scheduledAt) return 'unscheduled';
  const dayStart = startOfDay(nowMs);
  const t = new Date(s.scheduledAt).getTime();
  if (t < dayStart + DAY_MS) return 'today'; // includes overdue-but-uncancelled
  if (t < dayStart + 8 * DAY_MS) return 'week';
  return 'later';
}

export function groupAgenda<T extends AgendaSession>(active: T[], nowMs: number = Date.now()): AgendaGroup<T>[] {
  const buckets = new Map<AgendaGroupKey, T[]>();
  for (const s of active) {
    const key = bucketOf(s, nowMs);
    buckets.set(key, [...(buckets.get(key) ?? []), s]);
  }
  return ORDER.filter((k) => buckets.has(k)).map((key) => ({
    key,
    label: LABELS[key],
    sessions: [...(buckets.get(key) ?? [])].sort((a, b) => timeOf(a) - timeOf(b)),
  }));
}

export function filterHistory<T extends AgendaSession>(history: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return history;
  return history.filter((s) =>
    [s.team1Name, s.team2Name, s.gameSlug].some((v) => (v ?? '').toLowerCase().includes(q)),
  );
}

export interface HistorySides {
  team1Id: string;
  team2Id: string;
  team1Score: number | null;
  team2Score: number | null;
}

/** My side's result and score for a finished scrim, e.g. { result: 'W', score: '2 – 1' }. */
export function historyResult(
  s: HistorySides,
  myTeamId: string,
): { result: 'W' | 'L' | 'D'; score: string } | null {
  if (s.team1Score == null || s.team2Score == null) return null;
  const mine = s.team1Id === myTeamId ? s.team1Score : s.team2Score;
  const theirs = s.team1Id === myTeamId ? s.team2Score : s.team1Score;
  return { result: mine > theirs ? 'W' : mine < theirs ? 'L' : 'D', score: `${mine} – ${theirs}` };
}
