import type { Proposal } from '@/schemas/proposal';

/** The six places a partner can appear, as drawn in the placement mockups. */
export type ZoneKey = 'ticker' | 'header' | 'sidebar' | 'badge' | 'matchbar' | 'overlay';

export interface ZoneSlot {
  key: ZoneKey;
  marker: string;
  label: string;
  /** The first tier that includes this zone, when it can be worked out. */
  from: string;
}

const ZONES: Array<{ key: ZoneKey; words: string[] }> = [
  { key: 'ticker', words: ['ticker'] },
  { key: 'header', words: ['header'] },
  { key: 'sidebar', words: ['sidebar'] },
  { key: 'badge', words: ['badge'] },
  { key: 'matchbar', words: ['match bar', 'matchbar'] },
  { key: 'overlay', words: ['overlay', 'stream'] },
];

const NONE = new Set(['', '—', '-', '–']);

function matches(name: string, words: string[]): boolean {
  const lower = name.toLowerCase();
  return words.some((w) => lower.includes(w));
}

function tournamentFrom(doc: Extract<Proposal, { kind: 'tournament' }>, words: string[]) {
  const row = doc.zoneRows.find((r) => matches(r.zone, words));
  if (!row) return undefined;
  const index = row.cells.findIndex((c) => !NONE.has(c.trim()));
  return { label: row.zone, from: index >= 0 ? doc.tiers[index]?.name ?? '' : '' };
}

function platformFrom(doc: Extract<Proposal, { kind: 'platform' }>, words: string[]) {
  const zone = doc.zones.find((z) => matches(z.name, words));
  if (!zone) return undefined;
  return { label: zone.name, from: zone.tiers.split(',')[0]?.trim() ?? '' };
}

/**
 * Maps the document's own (editable) placement rows onto the six drawn zones.
 * Zones the document doesn't mention are left out, so the mockup never shows
 * something the proposal doesn't offer.
 */
export function resolveZoneSlots(doc: Proposal): ZoneSlot[] {
  const slots: ZoneSlot[] = [];
  for (const zone of ZONES) {
    const found = doc.kind === 'tournament' ? tournamentFrom(doc, zone.words) : platformFrom(doc, zone.words);
    if (!found) continue;
    slots.push({ key: zone.key, marker: String(slots.length + 1).padStart(2, '0'), ...found });
  }
  return slots;
}

export function slotFor(slots: ZoneSlot[], key: ZoneKey): ZoneSlot | undefined {
  return slots.find((s) => s.key === key);
}

export interface PlacementGroup {
  key: 'page' | 'ticker' | 'stream';
  title: string;
  body: string;
  /** Earliest tier that includes any zone in the group. */
  from: string;
}

const GROUPS: Array<Omit<PlacementGroup, 'from'> & { zones: ZoneKey[] }> = [
  { key: 'page', title: 'Tournament page', body: 'Banner, sidebar and card placements where players register, check in and follow the bracket.', zones: ['header', 'sidebar', 'badge', 'matchbar'] },
  { key: 'stream', title: 'Live stream', body: 'Overlay and break-screen branding on every broadcast.', zones: ['overlay'] },
  { key: 'ticker', title: 'Partner ticker', body: 'A standing place in the partner ticker across Esportra.', zones: ['ticker'] },
];

/** Three plain-language groups for the "where you appear" page, each with its entry tier. */
export function placementGroups(doc: Proposal): PlacementGroup[] {
  const slots = resolveZoneSlots(doc);
  const order = doc.tiers.map((t) => t.name);
  const rank = (name: string) => {
    const i = order.indexOf(name);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return GROUPS.flatMap(({ zones, ...group }) => {
    const found = slots.filter((s) => zones.includes(s.key) && s.from);
    if (found.length === 0) return [];
    const first = [...found].sort((a, b) => rank(a.from) - rank(b.from))[0];
    return [{ ...group, from: first.from }];
  });
}
