/**
 * usePracticeAndScrims — unified timeline hook
 *
 * Fetches practice sessions and scrim sessions for a team, merges them,
 * and groups by proximity: thisWeek / nextWeek / later / past.
 *
 * Grouping logic (per creative brief T5):
 *   thisWeek  — scheduledAt in [now, now+7d)
 *   nextWeek  — scheduledAt in [now+7d, now+14d)
 *   later     — scheduledAt >= now+14d, or no date + status=scheduled
 *   past      — status=completed|cancelled, or scheduledAt < now
 */

import { useMemo } from 'react';
import {
  usePracticeSessions,
  useTeamScrimSessions,
} from '@/hooks/competitive/useScrims';
import type { PracticeSession, ScrimSession } from '@/types/competitive';

// ── Timeline item types ───────────────────────────────────────────────────────

export interface PracticeTimelineItem {
  type: 'practice';
  id: string;
  scheduledAt: string | null;
  session: PracticeSession;
}

export interface ScrimTimelineItem {
  type: 'scrim';
  id: string;
  scheduledAt: string | null;
  session: ScrimSession;
}

export type TimelineItem = PracticeTimelineItem | ScrimTimelineItem;

export interface GroupedTimeline {
  thisWeek: TimelineItem[];
  nextWeek: TimelineItem[];
  later: TimelineItem[];
  past: TimelineItem[];
}

// ── Grouping logic ────────────────────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isPastStatus(item: TimelineItem): boolean {
  const status = item.session.status;
  return status === 'completed' || status === 'cancelled';
}

function sortAscending(a: TimelineItem, b: TimelineItem): number {
  const aMs = a.scheduledAt ? Date.parse(a.scheduledAt) : Infinity;
  const bMs = b.scheduledAt ? Date.parse(b.scheduledAt) : Infinity;
  return aMs - bMs;
}

function sortDescending(a: TimelineItem, b: TimelineItem): number {
  const aMs = a.scheduledAt ? Date.parse(a.scheduledAt) : -Infinity;
  const bMs = b.scheduledAt ? Date.parse(b.scheduledAt) : -Infinity;
  return bMs - aMs;
}

function groupItems(items: TimelineItem[], now: Date): GroupedTimeline {
  const nowMs = now.getTime();
  const result: GroupedTimeline = { thisWeek: [], nextWeek: [], later: [], past: [] };

  for (const item of items) {
    if (isPastStatus(item)) {
      result.past.push(item);
      continue;
    }

    const scheduledMs = item.scheduledAt ? Date.parse(item.scheduledAt) : null;

    if (scheduledMs === null) {
      // No date set + not completed/cancelled → later
      result.later.push(item);
    } else if (scheduledMs < nowMs) {
      // Past date but not marked done — treat as past
      result.past.push(item);
    } else if (scheduledMs < nowMs + WEEK_MS) {
      result.thisWeek.push(item);
    } else if (scheduledMs < nowMs + 2 * WEEK_MS) {
      result.nextWeek.push(item);
    } else {
      result.later.push(item);
    }
  }

  result.thisWeek.sort(sortAscending);
  result.nextWeek.sort(sortAscending);
  result.later.sort(sortAscending);
  result.past.sort(sortDescending);

  return result;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePracticeAndScrims(teamId: string) {
  const practiceQuery = usePracticeSessions(teamId);
  const scrimQuery = useTeamScrimSessions(teamId);

  const grouped = useMemo(() => {
    const now = new Date();
    const practice = practiceQuery.data ?? [];
    const scrims = scrimQuery.data ?? [];

    const items: TimelineItem[] = [
      ...practice.map((s): PracticeTimelineItem => ({
        type: 'practice',
        id: s.id,
        scheduledAt: s.scheduledAt,
        session: s,
      })),
      ...scrims.map((s): ScrimTimelineItem => ({
        type: 'scrim',
        id: s.id,
        scheduledAt: s.scheduledAt,
        session: s,
      })),
    ];

    return groupItems(items, now);
  }, [practiceQuery.data, scrimQuery.data]);

  const isLoading = practiceQuery.isLoading || scrimQuery.isLoading;
  const isError = practiceQuery.isError || scrimQuery.isError;
  const isEmpty =
    !isLoading &&
    !isError &&
    grouped.thisWeek.length === 0 &&
    grouped.nextWeek.length === 0 &&
    grouped.later.length === 0 &&
    grouped.past.length === 0;

  function refetch() {
    void practiceQuery.refetch();
    void scrimQuery.refetch();
  }

  return { grouped, isLoading, isError, isEmpty, refetch };
}
