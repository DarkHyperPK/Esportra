import type { Proposal } from '@/schemas/proposal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const FALLBACK_BRAND = 'Your brand';

/** "2026-11-06" → "6 November 2026". Returns the input when it isn't an ISO date. */
export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/** "PKR", 30000 → "PKR 30,000" (en-US grouping, always written in full). */
export function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString('en-US')}`.trim();
}

export function brandLabel(doc: Proposal): string {
  return doc.prospect.brandName.trim() || FALLBACK_BRAND;
}

/** Replaces {brand} and {industry} so one template reads correctly for any prospect. */
export function fillTokens(value: string, doc: Proposal): string {
  return value
    .split('{brand}').join(brandLabel(doc))
    .split('{industry}').join(doc.prospect.industry.trim() || 'your industry');
}

export function kindLabel(kind: Proposal['kind']): string {
  return kind === 'tournament' ? 'Tournament partner' : 'Platform partner';
}

/** Mono-caption facts: drops empties, joins with middots. */
export function joinFacts(facts: Array<string | undefined>): string {
  return facts.filter((f): f is string => Boolean(f && f.trim())).join(' · ');
}

/** Whole days from one ISO date to another; undefined when either is missing or the event has passed. */
export function daysUntil(fromIso: string, toIso: string): number | undefined {
  const parse = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? Date.parse(`${iso}T00:00:00Z`) : NaN);
  const from = parse(fromIso);
  const to = parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return undefined;
  return Math.round((to - from) / 86_400_000);
}
