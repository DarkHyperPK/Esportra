import type { Rate } from '@/types/scrimInsights';
import { NO_VALUE } from '@/services/scrimData/format';

/** 4000 -> "0:04", 63000 -> "1:03": a time into a round. */
export function roundClock(ms: number | null | undefined): string {
  if (ms == null) return NO_VALUE;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "3 of 5 · 60%": the figure and what it rests on. */
export function rateText(rate: Rate): string {
  if (rate.of === 0 || rate.pct == null) return NO_VALUE;
  return `${rate.count} of ${rate.of} · ${Math.round(rate.pct)}%`;
}

export function money(value: number | null | undefined): string {
  return value == null ? NO_VALUE : Math.round(value).toLocaleString('en-US');
}

const UUID = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** A weapon or armor name for what Riot recorded: a catalogue name when the id is known, the text itself when it is already a name, never a raw id. */
export function assetLabel(value: string | null | undefined, catalog: ReadonlyMap<string, string> | undefined): string {
  if (!value) return NO_VALUE;
  const fromCatalog = catalog?.get(value.toLowerCase());
  if (fromCatalog) return fromCatalog;
  return UUID.test(value) ? 'Unknown' : value;
}

export const BUY_LABEL: Record<string, string> = { pistol: 'Pistol', eco: 'Eco', force: 'Force buy', full: 'Full buy' };

export const BUY_MEANING = 'Buy is the average loadout value per player: eco up to 2,000, full buy from 3,900, force in between. Rounds 1 and 13 are pistol rounds.';
