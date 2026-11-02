/**
 * scrimListingView.ts
 *
 * Pure presentation logic for scrim listing cards: the availability week, the
 * "does this team suit mine?" label, and discovery sorting.
 */

import type { Tone } from '@/components/ui/kit/tone';
import { deriveScrimFit, type FitTeam, type ScrimFit } from '@/services/scrimFit';

// ── Availability week ────────────────────────────────────────────────────────

export interface WeekDay {
  /** Single letter for the compact grid. */
  label: string;
  /** Short name for screen readers and tooltips. */
  name: string;
  active: boolean;
}

// Backend days are 0 = Sunday … 6 = Saturday; scrim players think Monday-first.
const WEEK: ReadonlyArray<{ index: number; label: string; name: string }> = [
  { index: 1, label: 'M', name: 'Mon' },
  { index: 2, label: 'T', name: 'Tue' },
  { index: 3, label: 'W', name: 'Wed' },
  { index: 4, label: 'T', name: 'Thu' },
  { index: 5, label: 'F', name: 'Fri' },
  { index: 6, label: 'S', name: 'Sat' },
  { index: 0, label: 'S', name: 'Sun' },
];

export function weekFlags(days: number[] | null | undefined): WeekDay[] {
  const chosen = new Set(days ?? []);
  return WEEK.map(({ index, label, name }) => ({ label, name, active: chosen.has(index) }));
}

// ── Fit label ────────────────────────────────────────────────────────────────

export interface FitLabel {
  label: string;
  tone: Extract<Tone, 'success' | 'warning'>;
}

/** The one badge worth showing: what suits, or the first thing that does not. */
export function describeFit(fit: Pick<ScrimFit, 'rankOverlap' | 'sameRegion'> | null): FitLabel | null {
  if (!fit) return null;
  if (fit.rankOverlap === false) return { label: 'Rank gap', tone: 'warning' };
  if (fit.sameRegion === false) return { label: 'Other region', tone: 'warning' };
  if (fit.rankOverlap === true || fit.sameRegion === true) return { label: 'Good fit', tone: 'success' };
  return null;
}

// ── Sorting ──────────────────────────────────────────────────────────────────

export type DiscoverySort = 'newest' | 'record' | 'reliable';

export interface SortableListing {
  id: string;
  createdAt: string;
  record?: { wins: number; losses: number; completed: number; showRate: number | null } | null;
}

const winRate = (l: SortableListing): number | null => {
  const r = l.record;
  if (!r) return null;
  const decided = r.wins + r.losses;
  return decided > 0 ? r.wins / decided : null;
};

const showRate = (l: SortableListing): number | null => l.record?.showRate ?? null;
const experience = (l: SortableListing): number => l.record?.completed ?? 0;

/** Descending on a nullable key, unknowns last. */
const byKeyDesc = (key: (l: SortableListing) => number | null) => (a: SortableListing, b: SortableListing): number => {
  const ka = key(a);
  const kb = key(b);
  if (ka === null && kb === null) return 0;
  if (ka === null) return 1;
  if (kb === null) return -1;
  return kb - ka;
};

export function sortListings<T extends SortableListing>(listings: readonly T[], sort: DiscoverySort): T[] {
  const copy = [...listings];
  switch (sort) {
    case 'record':
      return copy.sort((a, b) => byKeyDesc(winRate)(a, b) || experience(b) - experience(a));
    case 'reliable':
      return copy.sort((a, b) => byKeyDesc(showRate)(a, b) || experience(b) - experience(a));
    case 'newest':
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// ── Fit against the viewer's own listing ─────────────────────────────────────


/** Compare a listing with the viewer's own band; null when the viewer has nothing to compare. */
export function fitLabelFor(mine: FitTeam | null, theirs: FitTeam): FitLabel | null {
  return mine ? describeFit(deriveScrimFit(mine, theirs)) : null;
}
