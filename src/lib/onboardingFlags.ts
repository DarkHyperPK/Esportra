/**
 * Centralized localStorage helpers for onboarding tour / tutorial flags.
 *
 * Canonical key format: `esportra_tour_<name>_seen`.
 * All tours across the app should funnel through these helpers so naming stays
 * consistent and future migrations live in a single place.
 */

const KEY = (name: string) => `esportra_tour_${name}_seen`;

const safeGet = (key: string): string | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    /* ignore storage errors (private mode, disabled, etc.) */
  }
};

const safeRemove = (key: string) => {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const hasSeenTour = (name: string): boolean => safeGet(KEY(name)) === 'true';

export const markTourSeen = (name: string): void => safeSet(KEY(name), 'true');

export const resetTour = (name: string): void => safeRemove(KEY(name));

// ─── One-shot migrations ─────────────────────────────────────────────────────
// Runs once on module load so legacy dismissals carry over to canonical keys.

const MIGRATION_FLAG = '__esportra_tour_migrations_v1';

const runMigrations = () => {
  if (typeof window === 'undefined') return;
  if (safeGet(MIGRATION_FLAG) === '1') return;

  safeSet(MIGRATION_FLAG, '1');
};

runMigrations();
